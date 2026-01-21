import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Avatar,
  MenuItem,
  Skeleton,
  Grid,
  Tooltip,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  MoreVert as MoreVertIcon,
  OpenInNew as OpenIcon,
  Schedule as ScheduleIcon,
  Login as ArrivedIcon,
  PlayArrow as InTreatmentIcon,
  CheckCircle as CompleteIcon,
  Block as NoShowIcon,
} from '@mui/icons-material';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { appointmentsApi, usersApi } from '../services/api';
import { Appointment, User, AppointmentStatus } from '../types';
import { formatTime12Hour } from '../utils/helpers';

// Status columns configuration
const COLUMNS = [
  { id: 'CONFIRMED', label: 'Scheduled', color: '#3b82f6', icon: <ScheduleIcon /> },
  { id: 'ARRIVED', label: 'Arrived', color: '#8b5cf6', icon: <ArrivedIcon /> },
  { id: 'IN_TREATMENT', label: 'In Treatment', color: '#f59e0b', icon: <InTreatmentIcon /> },
  { id: 'COMPLETED', label: 'Completed', color: '#22c55e', icon: <CompleteIcon /> },
];

// Map frontend status to backend status
const statusMap: Record<string, AppointmentStatus> = {
  'CONFIRMED': 'CONFIRMED',
  'ARRIVED': 'CONFIRMED', // Backend doesn't have ARRIVED, keep as CONFIRMED
  'IN_TREATMENT': 'CONFIRMED', // Backend doesn't have IN_TREATMENT
  'COMPLETED': 'COMPLETED',
};

// Draggable appointment card
interface DraggableCardProps {
  appointment: Appointment;
  onOpenMenu: (event: React.MouseEvent<HTMLElement>, appointment: Appointment) => void;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ appointment, onOpenMenu }) => {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: appointment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        mb: 1.5,
        cursor: 'grab',
        transition: 'all 0.2s',
        border: '1px solid #e2e8f0',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderColor: '#cbd5e1',
        },
        '&:active': {
          cursor: 'grabbing',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: '#0891b2',
              fontSize: '0.875rem',
              flexShrink: 0,
            }}
          >
            {appointment.patient?.firstName?.[0]}
            {appointment.patient?.lastName?.[0]}
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle2" 
              fontWeight={600} 
              noWrap
              sx={{ mb: 0.5 }}
            >
              {appointment.patient?.firstName} {appointment.patient?.lastName}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <TimeIcon sx={{ fontSize: 14, color: '#64748b' }} />
              <Typography variant="caption" color="text.secondary">
                {formatTime12Hour(appointment.startTime)} - {formatTime12Hour(appointment.endTime)}
              </Typography>
            </Box>
            
            {appointment.patient?.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon sx={{ fontSize: 14, color: '#64748b' }} />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {appointment.patient.phone}
                </Typography>
              </Box>
            )}
            
            {appointment.type && (
              <Chip
                label={appointment.type.replace('_', ' ')}
                size="small"
                sx={{
                  mt: 1,
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: '#f1f5f9',
                  color: '#475569',
                }}
              />
            )}
          </Box>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu(e, appointment);
            }}
            sx={{ ml: 'auto', flexShrink: 0 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

// Droppable Column component
interface ColumnProps {
  column: typeof COLUMNS[0];
  appointments: Appointment[];
  onOpenMenu: (event: React.MouseEvent<HTMLElement>, appointment: Appointment) => void;
}

const Column: React.FC<ColumnProps> = ({ column, appointments, onOpenMenu }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 280,
        maxWidth: 350,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Column Header */}
      <Box
        sx={{
          p: 2,
          borderRadius: '12px 12px 0 0',
          bgcolor: `${column.color}10`,
          borderBottom: `3px solid ${column.color}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: column.color }}>{column.icon}</Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {column.label}
          </Typography>
          <Chip
            label={appointments.length}
            size="small"
            sx={{
              ml: 'auto',
              bgcolor: column.color,
              color: '#fff',
              fontWeight: 600,
              minWidth: 28,
            }}
          />
        </Box>
      </Box>

      {/* Column Content - Droppable Area */}
      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          p: 1.5,
          bgcolor: isOver ? `${column.color}15` : '#f8fafc',
          borderRadius: '0 0 12px 12px',
          minHeight: 400,
          overflowY: 'auto',
          transition: 'background-color 0.2s ease',
          border: isOver ? `2px dashed ${column.color}` : '2px dashed transparent',
        }}
      >
        <SortableContext
          items={appointments.map(a => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {appointments.length === 0 ? (
            <Box
              sx={{
                height: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #e2e8f0',
                borderRadius: 2,
                color: '#94a3b8',
              }}
            >
              <Typography variant="body2">Drop here</Typography>
            </Box>
          ) : (
            appointments.map((appointment) => (
              <DraggableCard
                key={appointment.id}
                appointment={appointment}
                onOpenMenu={onOpenMenu}
              />
            ))
          )}
        </SortableContext>
      </Box>
    </Box>
  );
};

// Main component
const Today: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dentistFilter, setDentistFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Track custom status (frontend only for ARRIVED and IN_TREATMENT)
  const [customStatus, setCustomStatus] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTodaysAppointments = useCallback(async () => {
    try {
      const [appointmentsRes, dentistsRes] = await Promise.all([
        appointmentsApi.getToday(),
        usersApi.getDentists(),
      ]);

      if (appointmentsRes.data.success) {
        const appts = appointmentsRes.data.data || [];
        setAppointments(appts);
        
        // Initialize custom status from localStorage
        const savedStatus = localStorage.getItem('todayStatus');
        if (savedStatus) {
          const parsed = JSON.parse(savedStatus);
          // Only keep statuses for today's appointments
          const validStatus: Record<string, string> = {};
          appts.forEach((apt: Appointment) => {
            if (parsed[apt.id]) {
              validStatus[apt.id] = parsed[apt.id];
            }
          });
          setCustomStatus(validStatus);
        }
      }
      if (dentistsRes.data.success) {
        setDentists(dentistsRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch today\'s appointments:', error);
      toast.error('Failed to load today\'s appointments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTodaysAppointments();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTodaysAppointments, 30000);
    return () => clearInterval(interval);
  }, [fetchTodaysAppointments]);

  // Save custom status to localStorage
  useEffect(() => {
    localStorage.setItem('todayStatus', JSON.stringify(customStatus));
  }, [customStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTodaysAppointments();
  };

  const getAppointmentStatus = (appointment: Appointment): string => {
    // Check custom status first
    if (customStatus[appointment.id]) {
      return customStatus[appointment.id];
    }
    // Default to backend status
    return appointment.status;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const appointmentId = active.id as string;
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    // Determine which column was dropped on
    const overId = over.id as string;
    let newStatus: string;

    // Check if dropped on a column or another card
    if (COLUMNS.find(c => c.id === overId)) {
      newStatus = overId;
    } else {
      // Dropped on a card - find which column that card is in
      const targetAppointment = appointments.find(a => a.id === overId);
      if (targetAppointment) {
        newStatus = getAppointmentStatus(targetAppointment);
      } else {
        return;
      }
    }

    const currentStatus = getAppointmentStatus(appointment);
    if (currentStatus === newStatus) return;

    // Update custom status
    setCustomStatus(prev => ({
      ...prev,
      [appointmentId]: newStatus,
    }));

    // Update backend if it's a COMPLETED status
    if (newStatus === 'COMPLETED' || currentStatus === 'COMPLETED') {
      try {
        const backendStatus = newStatus === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED';
        await appointmentsApi.updateStatus(appointmentId, backendStatus);
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      } catch (error) {
        // Revert on error
        setCustomStatus(prev => ({
          ...prev,
          [appointmentId]: currentStatus,
        }));
      }
    } else {
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for visual feedback
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, appointment: Appointment) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedAppointment(appointment);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setSelectedAppointment(null);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!selectedAppointment) return;
    
    setCustomStatus(prev => ({
      ...prev,
      [selectedAppointment.id]: newStatus,
    }));
    
    // Update backend for COMPLETED
    if (newStatus === 'COMPLETED') {
      appointmentsApi.updateStatus(selectedAppointment.id, 'COMPLETED');
    } else if (getAppointmentStatus(selectedAppointment) === 'COMPLETED') {
      appointmentsApi.updateStatus(selectedAppointment.id, 'CONFIRMED');
    }
    
    toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    handleCloseMenu();
  };

  const handleMarkNoShow = async () => {
    if (!selectedAppointment) return;
    
    try {
      await appointmentsApi.updateStatus(selectedAppointment.id, 'NO_SHOW');
      toast.success('Marked as No Show');
      fetchTodaysAppointments();
    } catch (error) {
      // Error handled by interceptor
    }
    handleCloseMenu();
  };

  // Filter appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = !searchQuery || 
      apt.patient?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patient?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patient?.patientId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patient?.phone?.includes(searchQuery);
    
    const matchesDentist = !dentistFilter || apt.dentistId === dentistFilter;
    
    // Exclude cancelled and no-show from Kanban
    const notExcluded = apt.status !== 'CANCELLED' && apt.status !== 'NO_SHOW';
    
    return matchesSearch && matchesDentist && notExcluded;
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Group by status for columns
  const getColumnAppointments = (columnId: string) => {
    return filteredAppointments.filter(apt => getAppointmentStatus(apt) === columnId);
  };

  // Get active appointment for drag overlay
  const activeAppointment = activeId ? appointments.find(a => a.id === activeId) : null;

  // Stats
  const stats = {
    total: appointments.filter(a => a.status !== 'CANCELLED').length,
    scheduled: getColumnAppointments('CONFIRMED').length,
    arrived: getColumnAppointments('ARRIVED').length,
    inTreatment: getColumnAppointments('IN_TREATMENT').length,
    completed: getColumnAppointments('COMPLETED').length,
    cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
    noShow: appointments.filter(a => a.status === 'NO_SHOW').length,
  };

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Today's Schedule
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • {stats.total} appointments
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={refreshing ? <RefreshIcon className="animate-spin" /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {COLUMNS.map(col => (
          <Grid item xs={6} sm={3} key={col.id}>
            <Paper
              sx={{
                p: 2,
                textAlign: 'center',
                bgcolor: `${col.color}08`,
                border: `1px solid ${col.color}30`,
                borderRadius: 2,
              }}
            >
              <Typography variant="h4" fontWeight={700} sx={{ color: col.color }}>
                {getColumnAppointments(col.id).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {col.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <TextField
            select
            label="Dentist"
            value={dentistFilter}
            onChange={(e) => setDentistFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Dentists</MenuItem>
            {dentists.map((dentist) => (
              <MenuItem key={dentist.id} value={dentist.id}>
                Dr. {dentist.firstName} {dentist.lastName}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      {/* Kanban Board */}
      {loading ? (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {COLUMNS.map(col => (
            <Skeleton key={col.id} variant="rounded" width={300} height={500} />
          ))}
        </Box>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              pb: 2,
              minHeight: 500,
            }}
          >
            {COLUMNS.map(column => (
              <Column
                key={column.id}
                column={column}
                appointments={getColumnAppointments(column.id)}
                onOpenMenu={handleOpenMenu}
              />
            ))}
          </Box>

          <DragOverlay>
            {activeAppointment && (
              <Card
                sx={{
                  width: 300,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  transform: 'rotate(3deg)',
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#0891b2' }}>
                      {activeAppointment.patient?.firstName?.[0]}
                      {activeAppointment.patient?.lastName?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {activeAppointment.patient?.firstName} {activeAppointment.patient?.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activeAppointment.startTime} - {activeAppointment.endTime}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        PaperProps={{ sx: { minWidth: 200, boxShadow: '0 10px 25px rgba(0,0,0,0.15)' } }}
      >
        <MenuItem onClick={() => selectedAppointment && navigate(`/today/${selectedAppointment.id}`)}>
          <ListItemIcon><OpenIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Open Workflow</ListItemText>
        </MenuItem>
        <Divider />
        {COLUMNS.map(col => (
          <MenuItem
            key={col.id}
            onClick={() => handleStatusChange(col.id)}
            selected={selectedAppointment ? getAppointmentStatus(selectedAppointment) === col.id : false}
          >
            <ListItemIcon sx={{ color: col.color }}>{col.icon}</ListItemIcon>
            <ListItemText>{col.label}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleMarkNoShow} sx={{ color: 'error.main' }}>
          <ListItemIcon><NoShowIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Mark No Show</ListItemText>
        </MenuItem>
      </Menu>

      {/* Excluded appointments info */}
      {(stats.cancelled > 0 || stats.noShow > 0) && (
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {stats.cancelled > 0 && (
            <Chip
              label={`${stats.cancelled} Cancelled`}
              size="small"
              sx={{ bgcolor: '#ef444420', color: '#ef4444' }}
            />
          )}
          {stats.noShow > 0 && (
            <Chip
              label={`${stats.noShow} No Show`}
              size="small"
              sx={{ bgcolor: '#64748b20', color: '#64748b' }}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default Today;
