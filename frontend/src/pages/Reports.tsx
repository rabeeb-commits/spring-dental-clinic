import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Button,
  Menu,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers';
import { format, subMonths, startOfYear } from 'date-fns';
import toast from 'react-hot-toast';
import { reportsApi, reportsExportApi } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 24 }}>
    {value === index && children}
  </div>
);

const COLORS = ['#0891b2', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [revenueData, setRevenueData] = useState<any>(null);
  const [treatmentData, setTreatmentData] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (startDate) params.startDate = format(startDate, 'yyyy-MM-dd');
        if (endDate) params.endDate = format(endDate, 'yyyy-MM-dd');

        const [revenueRes, treatmentRes, patientRes, appointmentRes] = await Promise.all([
          reportsApi.getRevenue(params),
          reportsApi.getTreatments(params),
          reportsApi.getPatients(params),
          reportsApi.getAppointments(params),
        ]);

        if (revenueRes.data.success) setRevenueData(revenueRes.data.data);
        if (treatmentRes.data.success) setTreatmentData(treatmentRes.data.data);
        if (patientRes.data.success) setPatientData(patientRes.data.data);
        if (appointmentRes.data.success) setAppointmentData(appointmentRes.data.data);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
        toast.error('Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [startDate, endDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = async (type: string) => {
    handleExportClose();
    setExporting(true);
    
    try {
      const response = await reportsExportApi.exportToExcel(
        type,
        startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      );
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dental-report-${type}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Reports & Analytics
          </Typography>
          <Typography color="text.secondary" variant="body2">
            View clinic performance and statistics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            slotProps={{ textField: { size: 'small' } }}
          />
          <Button
            variant="contained"
            startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <ExportIcon />}
            onClick={handleExportClick}
            disabled={exporting}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => handleExport('all')}>
              <DownloadIcon sx={{ mr: 1, fontSize: 20 }} />
              Export All Reports
            </MenuItem>
            <MenuItem onClick={() => handleExport('patients')}>
              <DownloadIcon sx={{ mr: 1, fontSize: 20 }} />
              Export Patients
            </MenuItem>
            <MenuItem onClick={() => handleExport('appointments')}>
              <DownloadIcon sx={{ mr: 1, fontSize: 20 }} />
              Export Appointments
            </MenuItem>
            <MenuItem onClick={() => handleExport('treatments')}>
              <DownloadIcon sx={{ mr: 1, fontSize: 20 }} />
              Export Treatments
            </MenuItem>
            <MenuItem onClick={() => handleExport('invoices')}>
              <DownloadIcon sx={{ mr: 1, fontSize: 20 }} />
              Export Invoices
            </MenuItem>
            <MenuItem onClick={() => handleExport('payments')}>
              <DownloadIcon sx={{ mr: 1, fontSize: 20 }} />
              Export Payments
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Summary Cards */}
      {loading ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Revenue
                </Typography>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {formatCurrency(revenueData?.totalRevenue || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Outstanding
                </Typography>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {formatCurrency(revenueData?.outstanding || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Patients
                </Typography>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {formatNumber(patientData?.totalPatients || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Treatments
                </Typography>
                <Typography variant="h4" fontWeight={700} color="secondary.main">
                  {formatNumber(treatmentData?.totalTreatments || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Revenue" />
          <Tab label="Treatments" />
          <Tab label="Patients" />
          <Tab label="Appointments" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Revenue Tab */}
          <TabPanel value={activeTab} index={0}>
            {loading ? (
              <Skeleton variant="rounded" height={400} />
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" gutterBottom>
                    Monthly Revenue Trend
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={revenueData?.byMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `₹${(value / 1000)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#0891b2"
                        strokeWidth={3}
                        dot={{ fill: '#0891b2', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Revenue by Payment Mode
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={Object.entries(revenueData?.byPaymentMode || {}).map(([name, value]) => ({
                          name,
                          value,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {Object.entries(revenueData?.byPaymentMode || {}).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            )}
          </TabPanel>

          {/* Treatments Tab */}
          <TabPanel value={activeTab} index={1}>
            {loading ? (
              <Skeleton variant="rounded" height={400} />
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" gutterBottom>
                    Top Procedures
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={treatmentData?.byProcedure || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="procedure"
                        tick={{ fontSize: 11 }}
                        width={150}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0891b2" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Treatment Status
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={Object.entries(treatmentData?.byStatus || {}).map(([name, value]) => ({
                          name,
                          value,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {Object.entries(treatmentData?.byStatus || {}).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            )}
          </TabPanel>

          {/* Patients Tab */}
          <TabPanel value={activeTab} index={2}>
            {loading ? (
              <Skeleton variant="rounded" height={400} />
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" gutterBottom>
                    New Patients by Month
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={patientData?.newPatientsByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Patients by Gender
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={Object.entries(patientData?.byGender || {}).map(([name, value]) => ({
                          name,
                          value,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#ec4899" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            )}
          </TabPanel>

          {/* Appointments Tab */}
          <TabPanel value={activeTab} index={3}>
            {loading ? (
              <Skeleton variant="rounded" height={400} />
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Appointments by Status
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={Object.entries(appointmentData?.byStatus || {}).map(([name, value]) => ({
                          name,
                          value,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {Object.entries(appointmentData?.byStatus || {}).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Appointments by Type
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={Object.entries(appointmentData?.byType || {}).map(([name, value]) => ({
                        name,
                        count: value,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            )}
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default Reports;


