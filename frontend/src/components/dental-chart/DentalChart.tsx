import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { dentalChartsApi } from '../../services/api';
import { DentalChart as DentalChartType, ToothStatus, ToothData } from '../../types';

interface DentalChartProps {
  patientId: string;
}

const TOOTH_STATUS_COLORS: Record<ToothStatus, string> = {
  HEALTHY: '#10B981',
  CARIES: '#EF4444',
  MISSING: '#9CA3AF',
  RESTORED: '#3B82F6',
  CROWNED: '#F59E0B',
  ROOT_CANAL: '#8B5CF6',
  EXTRACTED: '#6B7280',
  IMPACTED: '#EC4899',
};

const TOOTH_STATUS_LABELS: Record<ToothStatus, string> = {
  HEALTHY: 'Healthy',
  CARIES: 'Caries',
  MISSING: 'Missing',
  RESTORED: 'Restored',
  CROWNED: 'Crowned',
  ROOT_CANAL: 'Root Canal',
  EXTRACTED: 'Extracted',
  IMPACTED: 'Impacted',
};

// Upper teeth: 18-11 (right), 21-28 (left)
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
// Lower teeth: 48-41 (right), 31-38 (left)
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const ALL_TEETH = [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_LEFT, ...LOWER_RIGHT];

interface ToothProps {
  number: number;
  status: ToothStatus;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  selected: boolean;
}

const Tooth: React.FC<ToothProps> = ({ number, status, onClick, selected }) => {
  const isMolar = number % 10 >= 6;
  const isPremolar = number % 10 >= 4 && number % 10 <= 5;
  const isCanine = number % 10 === 3;
  
  const size = isMolar ? 44 : isPremolar ? 38 : isCanine ? 34 : 32;

  return (
    <Tooltip title={`Tooth ${number}: ${TOOTH_STATUS_LABELS[status]}`} arrow>
      <Box
        onClick={onClick}
        sx={{
          width: size,
          height: size,
          borderRadius: isMolar ? '8px' : isPremolar ? '6px' : '50%',
          bgcolor: TOOTH_STATUS_COLORS[status],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          border: selected ? '3px solid #0891b2' : '2px solid transparent',
          boxShadow: selected ? '0 0 0 3px rgba(8, 145, 178, 0.3)' : 'none',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          },
        }}
      >
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: status === 'HEALTHY' || status === 'CROWNED' ? '#fff' : '#fff',
          }}
        >
          {number}
        </Typography>
      </Box>
    </Tooltip>
  );
};

const DentalChart: React.FC<DentalChartProps> = ({ patientId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chartData, setChartData] = useState<Record<number, ToothData>>({});
  const [chartId, setChartId] = useState<string | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize default chart data
  const getDefaultChartData = (): Record<number, ToothData> => {
    const teeth: Record<number, ToothData> = {};
    ALL_TEETH.forEach((num) => {
      teeth[num] = {
        number: num,
        status: 'HEALTHY',
        notes: '',
        treatments: [],
        diseases: [],
      };
    });
    return teeth;
  };

  const fetchChart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dentalChartsApi.getByPatient(patientId);
      if (response.data.success) {
        const chart = response.data.data;
        if (chart && chart.chartData && chart.chartData.teeth) {
          setChartData(chart.chartData.teeth);
          setChartId(chart.id || null);
        } else {
          setChartData(getDefaultChartData());
          setChartId(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dental chart:', error);
      setChartData(getDefaultChartData());
      toast.error('Failed to load dental chart. Using default chart.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const handleToothClick = (event: React.MouseEvent<HTMLElement>, toothNumber: number) => {
    setSelectedTooth(toothNumber);
    setAnchorEl(event.currentTarget);
  };

  const handleStatusChange = (status: ToothStatus) => {
    if (selectedTooth) {
      setChartData((prev) => ({
        ...prev,
        [selectedTooth]: {
          ...prev[selectedTooth],
          status,
        },
      }));
      setHasChanges(true);
    }
    setAnchorEl(null);
    setSelectedTooth(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await dentalChartsApi.save({
        patientId,
        chartData: { teeth: chartData, notes: '' },
      });
      setHasChanges(false);
      toast.success('Dental chart saved successfully');
    } catch (error) {
      toast.error('Failed to save dental chart');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          Dental Chart (FDI Notation)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={fetchChart} size="small">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges || saving}
            size="small"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Legend */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8fafc' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
          {Object.entries(TOOTH_STATUS_LABELS).map(([status, label]) => (
            <Chip
              key={status}
              label={label}
              size="small"
              sx={{
                bgcolor: TOOTH_STATUS_COLORS[status as ToothStatus],
                color: '#fff',
                fontWeight: 500,
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Dental Chart */}
      <Paper sx={{ p: 4, bgcolor: '#f8fafc' }}>
        {/* Upper Jaw */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block', textAlign: 'center' }}>
            UPPER JAW (Maxilla)
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            {/* Right side */}
            <Box sx={{ display: 'flex', gap: 0.5, pr: 2, borderRight: '2px dashed #cbd5e1' }}>
              {UPPER_RIGHT.map((num) => (
                <Tooth
                  key={num}
                  number={num}
                  status={chartData[num]?.status || 'HEALTHY'}
                  onClick={(e) => handleToothClick(e, num)}
                  selected={selectedTooth === num}
                />
              ))}
            </Box>
            {/* Left side */}
            <Box sx={{ display: 'flex', gap: 0.5, pl: 2 }}>
              {UPPER_LEFT.map((num) => (
                <Tooth
                  key={num}
                  number={num}
                  status={chartData[num]?.status || 'HEALTHY'}
                  onClick={(e) => handleToothClick(e, num)}
                  selected={selectedTooth === num}
                />
              ))}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 2 }}>
            <Typography variant="caption" color="text.secondary">RIGHT</Typography>
            <Typography variant="caption" color="text.secondary">LEFT</Typography>
          </Box>
        </Box>

        {/* Divider */}
        <Box sx={{ borderTop: '2px solid #e2e8f0', my: 3 }} />

        {/* Lower Jaw */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, px: 2 }}>
            <Typography variant="caption" color="text.secondary">RIGHT</Typography>
            <Typography variant="caption" color="text.secondary">LEFT</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            {/* Right side */}
            <Box sx={{ display: 'flex', gap: 0.5, pr: 2, borderRight: '2px dashed #cbd5e1' }}>
              {LOWER_RIGHT.map((num) => (
                <Tooth
                  key={num}
                  number={num}
                  status={chartData[num]?.status || 'HEALTHY'}
                  onClick={(e) => handleToothClick(e, num)}
                  selected={selectedTooth === num}
                />
              ))}
            </Box>
            {/* Left side */}
            <Box sx={{ display: 'flex', gap: 0.5, pl: 2 }}>
              {LOWER_LEFT.map((num) => (
                <Tooth
                  key={num}
                  number={num}
                  status={chartData[num]?.status || 'HEALTHY'}
                  onClick={(e) => handleToothClick(e, num)}
                  selected={selectedTooth === num}
                />
              ))}
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
            LOWER JAW (Mandible)
          </Typography>
        </Box>
      </Paper>

      {/* Status Selection Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
          setSelectedTooth(null);
        }}
        PaperProps={{ sx: { minWidth: 180 } }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="caption" color="text.secondary">
            Select Status for Tooth {selectedTooth}
          </Typography>
        </Box>
        {Object.entries(TOOTH_STATUS_LABELS).map(([status, label]) => (
          <MenuItem
            key={status}
            onClick={() => handleStatusChange(status as ToothStatus)}
            sx={{ gap: 1.5 }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: TOOTH_STATUS_COLORS[status as ToothStatus],
              }}
            />
            {label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default DentalChart;



