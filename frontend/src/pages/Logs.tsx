import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  Description as LogIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CleaningServices as CleanIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { logsApi } from '../services/api';

interface LogFile {
  filename: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  type: 'error' | 'info';
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  raw: string;
}

interface LogStats {
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  errorFiles: number;
  infoFiles: number;
  recentErrorsCount: number;
}

const Logs: React.FC = () => {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lineLimit, setLineLimit] = useState(100);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearDays, setClearDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogFiles = useCallback(async () => {
    try {
      const [filesRes, statsRes] = await Promise.all([
        logsApi.list(),
        logsApi.getStats(),
      ]);
      
      if (filesRes.data.success) {
        setLogFiles(filesRes.data.data || []);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to load logs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogFiles();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogFiles, 30000);
    return () => clearInterval(interval);
  }, [fetchLogFiles]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogFiles();
  };

  const handleViewLog = async (filename: string) => {
    setSelectedFile(filename);
    setLoadingEntries(true);
    setViewDialogOpen(true);
    
    try {
      const response = await logsApi.getFile(filename, lineLimit, searchQuery);
      if (response.data.success) {
        setLogEntries(response.data.data.entries || []);
      }
    } catch (error) {
      toast.error('Failed to load log file');
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleSearchInLog = async () => {
    if (!selectedFile) return;
    setLoadingEntries(true);
    
    try {
      const response = await logsApi.getFile(selectedFile, lineLimit, searchQuery);
      if (response.data.success) {
        setLogEntries(response.data.data.entries || []);
      }
    } catch (error) {
      toast.error('Failed to search logs');
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const response = await logsApi.download(filename);
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Log file downloaded');
    } catch (error) {
      toast.error('Failed to download log file');
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Delete log file "${filename}"?`)) return;
    
    try {
      await logsApi.delete(filename);
      toast.success('Log file deleted');
      fetchLogFiles();
    } catch (error) {
      toast.error('Failed to delete log file');
    }
  };

  const handleClearOldLogs = async () => {
    try {
      const response = await logsApi.clear(clearDays);
      if (response.data.success) {
        toast.success(response.data.message);
        setClearDialogOpen(false);
        fetchLogFiles();
      }
    } catch (error) {
      toast.error('Failed to clear old logs');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return '#ef4444';
      case 'WARN':
      case 'WARNING':
        return '#f59e0b';
      case 'INFO':
        return '#3b82f6';
      case 'DEBUG':
        return '#8b5cf6';
      default:
        return '#64748b';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return <ErrorIcon fontSize="small" sx={{ color: '#ef4444' }} />;
      case 'WARN':
      case 'WARNING':
        return <WarningIcon fontSize="small" sx={{ color: '#f59e0b' }} />;
      case 'INFO':
        return <InfoIcon fontSize="small" sx={{ color: '#3b82f6' }} />;
      default:
        return <LogIcon fontSize="small" sx={{ color: '#64748b' }} />;
    }
  };

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            System Logs
          </Typography>
          <Typography color="text.secondary" variant="body2">
            View and manage application logs
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CleanIcon />}
            onClick={() => setClearDialogOpen(true)}
          >
            Clear Old Logs
          </Button>
          <Button
            variant="outlined"
            startIcon={refreshing ? <RefreshIcon className="animate-spin" /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {loading ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
      ) : stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {stats.totalFiles}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Log Files
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="info.main">
                  {stats.totalSizeFormatted}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Size
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {stats.errorFiles}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Error Log Files
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {stats.recentErrorsCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Today's Errors
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Log Files List */}
      {loading ? (
        <Skeleton variant="rounded" height={400} />
      ) : logFiles.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <LogIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
          <Typography color="text.secondary">No log files found</Typography>
          <Typography variant="body2" color="text.secondary">
            Logs will appear here once the system starts logging activities
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Log File</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Modified</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logFiles.map((file) => (
                <TableRow key={file.filename} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {file.type === 'error' ? (
                        <ErrorIcon sx={{ color: '#ef4444' }} />
                      ) : (
                        <InfoIcon sx={{ color: '#3b82f6' }} />
                      )}
                      <Typography variant="body2" fontWeight={500}>
                        {file.filename}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={file.type}
                      size="small"
                      sx={{
                        bgcolor: file.type === 'error' ? '#fef2f2' : '#eff6ff',
                        color: file.type === 'error' ? '#ef4444' : '#3b82f6',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatBytes(file.size)}</TableCell>
                  <TableCell>
                    {format(new Date(file.modifiedAt), 'PPp')}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => handleViewLog(file.filename)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(file.filename)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(file.filename)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Log Viewer Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{selectedFile}</Typography>
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <ClearIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {/* Search and filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              placeholder="Search in logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchInLog()}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              label="Lines"
              value={lineLimit}
              onChange={(e) => setLineLimit(Number(e.target.value))}
              size="small"
              sx={{ minWidth: 100 }}
            >
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
              <MenuItem value={500}>500</MenuItem>
              <MenuItem value={1000}>1000</MenuItem>
            </TextField>
            <Button
              variant="contained"
              onClick={handleSearchInLog}
              disabled={loadingEntries}
            >
              Search
            </Button>
          </Box>

          {/* Log entries */}
          {loadingEntries ? (
            <Box>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="text" height={24} sx={{ mb: 0.5 }} />
              ))}
            </Box>
          ) : logEntries.length === 0 ? (
            <Alert severity="info">No log entries found</Alert>
          ) : (
            <Box
              sx={{
                bgcolor: '#1e293b',
                borderRadius: 2,
                p: 2,
                maxHeight: 500,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
              }}
            >
              {logEntries.map((entry, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    gap: 1,
                    py: 0.5,
                    borderBottom: '1px solid #334155',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  {getLevelIcon(entry.level)}
                  <Typography
                    component="span"
                    sx={{ color: '#94a3b8', minWidth: 140, flexShrink: 0 }}
                  >
                    {entry.timestamp}
                  </Typography>
                  <Chip
                    label={entry.level}
                    size="small"
                    sx={{
                      bgcolor: `${getLevelColor(entry.level)}20`,
                      color: getLevelColor(entry.level),
                      height: 20,
                      fontSize: '0.7rem',
                      minWidth: 60,
                    }}
                  />
                  <Typography
                    component="span"
                    sx={{
                      color: '#e2e8f0',
                      wordBreak: 'break-word',
                      flex: 1,
                    }}
                  >
                    {entry.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => selectedFile && handleDownload(selectedFile)}>
            Download
          </Button>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Clear Logs Dialog */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Clear Old Logs</Typography>
            <IconButton
              aria-label="close"
              onClick={() => setClearDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <ClearIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will permanently delete old log files. This action cannot be undone.
          </Alert>
          <TextField
            select
            fullWidth
            label="Delete logs older than"
            value={clearDays}
            onChange={(e) => setClearDays(Number(e.target.value))}
          >
            <MenuItem value={1}>1 day</MenuItem>
            <MenuItem value={3}>3 days</MenuItem>
            <MenuItem value={7}>7 days</MenuItem>
            <MenuItem value={14}>14 days</MenuItem>
            <MenuItem value={30}>30 days</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleClearOldLogs}>
            Clear Logs
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Logs;

