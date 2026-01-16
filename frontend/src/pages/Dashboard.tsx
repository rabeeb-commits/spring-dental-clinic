import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  PersonAdd as PersonAddIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowForwardIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { reportsApi, appointmentsApi } from '../services/api';
import { DashboardData, Appointment } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { sendAppointmentReminder } from '../utils/whatsapp';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; isPositive: boolean };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}) => (
  <Card
    sx={{
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 20px -5px rgb(0 0 0 / 0.1)',
      },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}15`,
            color: color,
          }}
        >
          {icon}
        </Box>
        {trend && (
          <Chip
            size="small"
            icon={<TrendingUpIcon sx={{ fontSize: '1rem !important' }} />}
            label={`${trend.isPositive ? '+' : ''}${trend.value}%`}
            sx={{
              bgcolor: trend.isPositive ? '#dcfce7' : '#fee2e2',
              color: trend.isPositive ? '#16a34a' : '#dc2626',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        )}
      </Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        {value}
      </Typography>
      <Typography color="text.secondary" variant="body2">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
    <Box
      sx={{
        position: 'absolute',
        bottom: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: '50%',
        bgcolor: `${color}08`,
      }}
    />
  </Card>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, appointmentsRes] = await Promise.all([
          reportsApi.getDashboard(),
          appointmentsApi.getToday(),
        ]);

        if (dashboardRes.data.success) {
          setDashboardData(dashboardRes.data.data);
        }
        if (appointmentsRes.data.success) {
          setTodaysAppointments(appointmentsRes.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSendWhatsApp = (appointment: Appointment) => {
    if (!appointment.patient?.phone) {
      toast.error('Patient phone number is not available');
      return;
    }

    const appointmentDate = format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy');
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const dentistName = appointment.dentist 
      ? `${appointment.dentist.firstName} ${appointment.dentist.lastName}`
      : 'N/A';

    sendAppointmentReminder({
      phone: appointment.patient.phone,
      patientName,
      date: appointmentDate,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      dentistName,
      type: appointment.type,
    });

    toast.success('Opening WhatsApp...');
  };


  if (loading) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }

  return (
    <Box className="animate-fade-in">
      {/* Welcome message */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName}! 👋
        </Typography>
        <Typography color="text.secondary">
          Here&apos;s what&apos;s happening at your clinic today
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Patients"
            value={dashboardData?.patients.total || 0}
            subtitle={`${dashboardData?.patients.newThisMonth || 0} new this month`}
            icon={<PeopleIcon />}
            color="#0891b2"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Today's Appointments"
            value={dashboardData?.appointments.today || 0}
            subtitle={`${dashboardData?.appointments.pending || 0} pending`}
            icon={<CalendarIcon />}
            color="#8b5cf6"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(dashboardData?.revenue.thisMonth || 0)}
            subtitle={`${formatCurrency(dashboardData?.revenue.today || 0)} today`}
            icon={<WalletIcon />}
            color="#10b981"
            trend={{ value: 12, isPositive: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Outstanding"
            value={formatCurrency(dashboardData?.revenue.outstanding || 0)}
            subtitle="To be collected"
            icon={<TrendingUpIcon />}
            color="#f59e0b"
          />
        </Grid>
      </Grid>

      {/* Quick Actions & Today's Schedule */}
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                fullWidth
                onClick={() => navigate('/patients?action=new')}
                sx={{
                  py: 1.5,
                  justifyContent: 'flex-start',
                  bgcolor: '#0891b2',
                  '&:hover': { bgcolor: '#0e7490' },
                }}
              >
                Register New Patient
              </Button>
              <Button
                variant="outlined"
                startIcon={<ScheduleIcon />}
                fullWidth
                onClick={() => navigate('/appointments?action=new')}
                sx={{ py: 1.5, justifyContent: 'flex-start' }}
              >
                Schedule Appointment
              </Button>
              <Button
                variant="outlined"
                startIcon={<WalletIcon />}
                fullWidth
                onClick={() => navigate('/billing?action=new')}
                sx={{ py: 1.5, justifyContent: 'flex-start' }}
              >
                Create Invoice
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Treatments in Progress */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Treatments In Progress
              </Typography>
              <Typography variant="h3" fontWeight={700} color="primary.main">
                {dashboardData?.treatments.inProgress || 0}
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/treatments?status=IN_PROGRESS')}
                sx={{ mt: 1, p: 0 }}
              >
                View all
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Today's Appointments */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Today&apos;s Schedule
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/appointments')}
              >
                View Calendar
              </Button>
            </Box>

            {todaysAppointments.length === 0 ? (
              <EmptyState
                type="default"
                title="No appointments today"
                message="You have no appointments scheduled for today"
                icon={<CalendarIcon sx={{ fontSize: 64, color: '#94a3b8' }} />}
              />
            ) : (
              <List sx={{ p: 0 }}>
                {todaysAppointments.slice(0, 5).map((appointment, index) => (
                  <ListItem
                    key={appointment.id}
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: index % 2 === 0 ? '#f8fafc' : 'transparent',
                      '&:hover': { bgcolor: '#f1f5f9' },
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/patients/${appointment.patientId}`)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Appointment with ${appointment.patient?.firstName} ${appointment.patient?.lastName}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/patients/${appointment.patientId}`);
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#0891b2' }}>
                        {appointment.patient?.firstName?.[0]}
                        {appointment.patient?.lastName?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography fontWeight={500}>
                          {appointment.patient?.firstName} {appointment.patient?.lastName}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption">
                            {appointment.startTime} - {appointment.endTime}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • {appointment.type.replace('_', ' ')}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {appointment.patient?.phone && (
                        <Tooltip title="Send WhatsApp Reminder">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendWhatsApp(appointment);
                            }}
                            sx={{
                              color: '#25D366',
                              '&:hover': { bgcolor: '#25D36615' },
                            }}
                          >
                            <WhatsAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <StatusBadge status={appointment.status} />
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}

            {todaysAppointments.length > 5 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button size="small" onClick={() => navigate('/appointments')}>
                  View {todaysAppointments.length - 5} more appointments
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;



