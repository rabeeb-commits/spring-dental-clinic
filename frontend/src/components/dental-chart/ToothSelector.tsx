import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Tooltip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

// FDI Tooth numbering constants
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const ALL_TEETH = [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_LEFT, ...LOWER_RIGHT];

interface ToothSelectorProps {
  selectedTeeth: number[];
  onSelectionChange: (teeth: number[]) => void;
  mode?: 'select' | 'view';
  showQuickSelect?: boolean;
  compact?: boolean;
}

interface ToothProps {
  number: number;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
}

const Tooth: React.FC<ToothProps> = ({ number, isSelected, onClick, compact = false }) => {
  const isMolar = number % 10 >= 6;
  const isPremolar = number % 10 >= 4 && number % 10 <= 5;
  const isCanine = number % 10 === 3;
  
  // Responsive sizing based on screen size
  const getSize = () => {
    if (compact) {
      return {
        xs: isMolar ? 24 : isPremolar ? 22 : isCanine ? 20 : 18,
        sm: isMolar ? 28 : isPremolar ? 26 : isCanine ? 24 : 22,
        md: isMolar ? 32 : isPremolar ? 28 : isCanine ? 26 : 24,
      };
    }
    return {
      xs: isMolar ? 32 : isPremolar ? 28 : isCanine ? 26 : 24,
      sm: isMolar ? 36 : isPremolar ? 32 : isCanine ? 30 : 28,
      md: isMolar ? 44 : isPremolar ? 38 : isCanine ? 34 : 32,
    };
  };
  
  const sizes = getSize();

  return (
    <Tooltip title={`Tooth ${number} (FDI)`} arrow>
      <Box
        onClick={onClick}
        sx={{
          width: { xs: sizes.xs, sm: sizes.sm, md: sizes.md },
          height: { xs: sizes.xs, sm: sizes.sm, md: sizes.md },
          minWidth: { xs: sizes.xs, sm: sizes.sm, md: sizes.md },
          minHeight: { xs: sizes.xs, sm: sizes.sm, md: sizes.md },
          borderRadius: isMolar ? '8px' : isPremolar ? '6px' : '50%',
          bgcolor: isSelected ? '#0891b2' : '#e2e8f0',
          border: isSelected ? '3px solid #0e7490' : '2px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: isSelected 
            ? '0 0 0 3px rgba(8, 145, 178, 0.3), 0 2px 8px rgba(8, 145, 178, 0.2)' 
            : '0 1px 3px rgba(0,0,0,0.1)',
          '&:hover': {
            transform: 'scale(1.15)',
            boxShadow: isSelected
              ? '0 0 0 4px rgba(8, 145, 178, 0.4), 0 4px 12px rgba(8, 145, 178, 0.3)'
              : '0 4px 12px rgba(0,0,0,0.2)',
            bgcolor: isSelected ? '#0e7490' : '#cbd5e1',
          },
        }}
      >
        <Typography
          sx={{
            fontSize: { 
              xs: compact ? '0.5rem' : '0.55rem', 
              sm: compact ? '0.55rem' : '0.65rem', 
              md: compact ? '0.6rem' : '0.7rem' 
            },
            fontWeight: 700,
            color: isSelected ? '#fff' : '#64748b',
          }}
        >
          {number}
        </Typography>
      </Box>
    </Tooltip>
  );
};

const ToothSelector: React.FC<ToothSelectorProps> = ({
  selectedTeeth,
  onSelectionChange,
  mode = 'select',
  showQuickSelect = true,
  compact = false,
}) => {
  // Always start expanded for better UX - users can collapse if needed
  const [expanded, setExpanded] = useState(true);

  const handleToothClick = (toothNumber: number) => {
    if (mode === 'view') return;
    
    const isSelected = selectedTeeth.includes(toothNumber);
    if (isSelected) {
      onSelectionChange(selectedTeeth.filter(t => t !== toothNumber));
    } else {
      onSelectionChange([...selectedTeeth, toothNumber].sort((a, b) => a - b));
    }
  };

  const handleSelectAll = () => {
    onSelectionChange([...ALL_TEETH]);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const handleSelectQuadrant = (teeth: number[]) => {
    const newSelection = [...selectedTeeth];
    teeth.forEach(tooth => {
      if (!newSelection.includes(tooth)) {
        newSelection.push(tooth);
      }
    });
    onSelectionChange(newSelection.sort((a, b) => a - b));
  };

  const handleDeselectQuadrant = (teeth: number[]) => {
    onSelectionChange(selectedTeeth.filter(t => !teeth.includes(t)));
  };

  const toggleQuadrant = (teeth: number[]) => {
    const allSelected = teeth.every(t => selectedTeeth.includes(t));
    if (allSelected) {
      handleDeselectQuadrant(teeth);
    } else {
      handleSelectQuadrant(teeth);
    }
  };

  const isQuadrantSelected = (teeth: number[]) => {
    return teeth.every(t => selectedTeeth.includes(t));
  };

  return (
    <Box>
      {/* Header with selection count */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1, sm: 0 },
        mb: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            Affected Teeth {mode === 'select' && `(${selectedTeeth.length} selected)`}
          </Typography>
          {selectedTeeth.length > 0 && (
            <Chip
              label={`${selectedTeeth.length} tooth${selectedTeeth.length !== 1 ? 's' : ''}`}
              size="small"
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        {!compact && (
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: 'text.secondary' }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>

      {/* Quick Select Buttons */}
      {showQuickSelect && mode === 'select' && expanded && (
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, bgcolor: '#f8fafc' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Quick Select:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 1 } }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SelectAllIcon />}
              onClick={handleSelectAll}
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, px: { xs: 1, sm: 2 } }}
            >
              All
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleDeselectAll}
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, px: { xs: 1, sm: 2 } }}
            >
              Clear
            </Button>
            <Button
              size="small"
              variant={isQuadrantSelected([...UPPER_RIGHT, ...UPPER_LEFT]) ? 'contained' : 'outlined'}
              onClick={() => toggleQuadrant([...UPPER_RIGHT, ...UPPER_LEFT])}
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, px: { xs: 1, sm: 2 } }}
            >
              Upper Jaw
            </Button>
            <Button
              size="small"
              variant={isQuadrantSelected([...LOWER_LEFT, ...LOWER_RIGHT]) ? 'contained' : 'outlined'}
              onClick={() => toggleQuadrant([...LOWER_LEFT, ...LOWER_RIGHT])}
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, px: { xs: 1, sm: 2 } }}
            >
              Lower Jaw
            </Button>
            <Button
              size="small"
              variant={isQuadrantSelected(UPPER_RIGHT) ? 'contained' : 'outlined'}
              onClick={() => toggleQuadrant(UPPER_RIGHT)}
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, px: { xs: 1, sm: 2 } }}
            >
              UR Quad
            </Button>
            <Button
              size="small"
              variant={isQuadrantSelected(UPPER_LEFT) ? 'contained' : 'outlined'}
              onClick={() => toggleQuadrant(UPPER_LEFT)}
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, px: { xs: 1, sm: 2 } }}
            >
              UL Quad
            </Button>
            <Button
              size="small"
              variant={isQuadrantSelected(LOWER_LEFT) ? 'contained' : 'outlined'}
              onClick={() => toggleQuadrant(LOWER_LEFT)}
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, px: { xs: 1, sm: 2 } }}
            >
              LL Quad
            </Button>
            <Button
              size="small"
              variant={isQuadrantSelected(LOWER_RIGHT) ? 'contained' : 'outlined'}
              onClick={() => toggleQuadrant(LOWER_RIGHT)}
              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, px: { xs: 1, sm: 2 } }}
            >
              LR Quad
            </Button>
          </Box>
        </Paper>
      )}

      {/* Selected Teeth Display */}
      {selectedTeeth.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selectedTeeth.map(tooth => (
            <Chip
              key={tooth}
              label={tooth}
              size="small"
              color="primary"
              onDelete={mode === 'select' ? () => handleToothClick(tooth) : undefined}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>
      )}

      {/* Dental Chart */}
      <Collapse in={expanded}>
        <Paper sx={{ 
          p: { xs: 1, sm: compact ? 2 : 3, md: compact ? 2 : 4 }, 
          bgcolor: '#f8fafc',
          overflowX: 'auto',
        }}>
          <Box sx={{ minWidth: { xs: '280px', sm: 'auto' } }}>
            {/* Upper Jaw */}
            <Box sx={{ mb: { xs: 2, sm: 4 } }}>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  mb: { xs: 1, sm: 2 }, 
                  display: 'block', 
                  textAlign: 'center',
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }}
              >
                UPPER JAW (Maxilla)
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: { xs: 0.2, sm: compact ? 0.3 : 0.4, md: compact ? 0.3 : 0.5 },
                flexWrap: { xs: 'nowrap', sm: 'nowrap' },
                overflowX: { xs: 'auto', sm: 'visible' },
              }}>
                {/* Right side */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 0.2, sm: compact ? 0.3 : 0.4, md: compact ? 0.3 : 0.5 }, 
                  pr: { xs: 1, sm: 2 }, 
                  borderRight: { xs: '1px dashed #cbd5e1', sm: '2px dashed #cbd5e1' }
                }}>
                  {UPPER_RIGHT.map((num) => (
                    <Tooth
                      key={num}
                      number={num}
                      isSelected={selectedTeeth.includes(num)}
                      onClick={() => handleToothClick(num)}
                      compact={compact}
                    />
                  ))}
                </Box>
                {/* Left side */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 0.2, sm: compact ? 0.3 : 0.4, md: compact ? 0.3 : 0.5 }, 
                  pl: { xs: 1, sm: 2 }
                }}>
                  {UPPER_LEFT.map((num) => (
                    <Tooth
                      key={num}
                      number={num}
                      isSelected={selectedTeeth.includes(num)}
                      onClick={() => handleToothClick(num)}
                      compact={compact}
                    />
                  ))}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: { xs: 1, sm: 2 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  RIGHT
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  LEFT
                </Typography>
              </Box>
            </Box>

            {/* Divider */}
            <Box sx={{ borderTop: '2px solid #e2e8f0', my: { xs: 2, sm: 3 } }} />

            {/* Lower Jaw */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, px: { xs: 1, sm: 2 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  RIGHT
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  LEFT
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: { xs: 0.2, sm: compact ? 0.3 : 0.4, md: compact ? 0.3 : 0.5 },
                flexWrap: { xs: 'nowrap', sm: 'nowrap' },
                overflowX: { xs: 'auto', sm: 'visible' },
              }}>
                {/* Right side */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 0.2, sm: compact ? 0.3 : 0.4, md: compact ? 0.3 : 0.5 }, 
                  pr: { xs: 1, sm: 2 }, 
                  borderRight: { xs: '1px dashed #cbd5e1', sm: '2px dashed #cbd5e1' }
                }}>
                  {LOWER_RIGHT.map((num) => (
                    <Tooth
                      key={num}
                      number={num}
                      isSelected={selectedTeeth.includes(num)}
                      onClick={() => handleToothClick(num)}
                      compact={compact}
                    />
                  ))}
                </Box>
                {/* Left side */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 0.2, sm: compact ? 0.3 : 0.4, md: compact ? 0.3 : 0.5 }, 
                  pl: { xs: 1, sm: 2 }
                }}>
                  {LOWER_LEFT.map((num) => (
                    <Tooth
                      key={num}
                      number={num}
                      isSelected={selectedTeeth.includes(num)}
                      onClick={() => handleToothClick(num)}
                      compact={compact}
                    />
                  ))}
                </Box>
              </Box>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  mt: { xs: 1, sm: 2 }, 
                  display: 'block', 
                  textAlign: 'center',
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }}
              >
                LOWER JAW (Mandible)
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default ToothSelector;
