import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  MedicalServices as TreatmentIcon,
  Receipt as BillingIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  ChevronLeft as ChevronLeftIcon,
  Today as TodayIcon,
  Category as CategoryIcon,
  Description as LogsIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useClinic } from '../../context/ClinicContext';
import { useContextualShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useThemeMode } from '../../context/ThemeContext';

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Today', path: '/today', icon: <TodayIcon /> },
  { label: 'Patients', path: '/patients', icon: <PeopleIcon /> },
  { label: 'Appointments', path: '/appointments', icon: <CalendarIcon /> },
  { label: 'Treatments', path: '/treatments', icon: <TreatmentIcon /> },
  { label: 'Billing', path: '/billing', icon: <BillingIcon /> },
  { label: 'Reports', path: '/reports', icon: <ReportsIcon /> },
  { label: 'Procedures', path: '/procedures', icon: <CategoryIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  { label: 'Logs', path: '/logs', icon: <LogsIcon />, adminOnly: true },
];

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { settings: clinicSettings } = useClinic();
  const { mode, toggleMode } = useThemeMode();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Enable keyboard shortcuts
  useContextualShortcuts();

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const drawerWidth = collapsed && !isMobile ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const drawer = (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: mode === 'dark' 
            ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: mode === 'dark'
              ? 'radial-gradient(circle at 20% 50%, rgba(8, 145, 178, 0.1) 0%, transparent 50%)'
              : 'radial-gradient(circle at 20% 50%, rgba(8, 145, 178, 0.05) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
      {/* Logo */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          gap: 1,
          minHeight: 64,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {(!collapsed || isMobile) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: clinicSettings.logo.startsWith('http') ? '0' : '1.5rem',
                overflow: 'hidden',
              }}
            >
              {clinicSettings.logo.startsWith('http') ? (
                <img src={clinicSettings.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                clinicSettings.logo
              )}
            </Box>
            <Typography
              variant="h6"
              sx={{
                color: mode === 'dark' ? '#fff' : theme.palette.text.primary,
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              {clinicSettings.name}
            </Typography>
          </Box>
        )}
        {collapsed && !isMobile && (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: clinicSettings.logo.startsWith('http') ? '0' : '1.5rem',
              overflow: 'hidden',
            }}
          >
            {clinicSettings.logo.startsWith('http') ? (
              <img src={clinicSettings.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              clinicSettings.logo
            )}
          </Box>
        )}
        {!isMobile && (
          <IconButton
            onClick={handleDrawerToggle}
            sx={{ 
              color: '#94a3b8', 
              ml: collapsed ? 0 : 'auto',
              transition: 'all 0.2s',
              '&:hover': {
                color: '#cbd5e1',
                bgcolor: 'rgba(148, 163, 184, 0.1)',
                transform: 'scale(1.1)',
              },
            }}
            size="small"
          >
            <ChevronLeftIcon
              sx={{
                transform: collapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease-in-out',
              }}
            />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ 
        borderColor: mode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(0, 0, 0, 0.08)', 
        position: 'relative', 
        zIndex: 1 
      }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 2, position: 'relative', zIndex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems
          .filter((item) => !item.adminOnly || user?.role === 'ADMIN')
          .map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Tooltip
              key={item.path}
              title={collapsed && !isMobile ? item.label : ''}
              placement="right"
              arrow
            >
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  mb: 0.5,
                  borderRadius: 2,
                  color: isActive 
                    ? (mode === 'dark' ? '#fff' : theme.palette.primary.main)
                    : (mode === 'dark' ? '#94a3b8' : theme.palette.text.secondary),
                  bgcolor: isActive 
                    ? (mode === 'dark' ? 'rgba(8, 145, 178, 0.25)' : 'rgba(8, 145, 178, 0.1)')
                    : 'transparent',
                  justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                  px: collapsed && !isMobile ? 2 : 2.5,
                  py: { xs: 1.25, sm: 1 },
                  minHeight: { xs: 48, sm: 40 },
                  transition: 'all 0.2s ease-in-out',
                  position: 'relative',
                  '&::before': isActive ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: '60%',
                    bgcolor: theme.palette.primary.light,
                    borderRadius: '0 2px 2px 0',
                  } : {},
                  '&:hover': {
                    bgcolor: isActive 
                      ? (mode === 'dark' ? 'rgba(8, 145, 178, 0.35)' : 'rgba(8, 145, 178, 0.15)')
                      : (mode === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
                    color: isActive 
                      ? (mode === 'dark' ? '#fff' : theme.palette.primary.main)
                      : (mode === 'dark' ? '#cbd5e1' : theme.palette.text.primary),
                    transform: 'translateX(2px)',
                  },
                  '&:active': {
                    transform: 'translateX(0)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive 
                      ? theme.palette.primary.light 
                      : (mode === 'dark' ? '#64748b' : theme.palette.text.secondary),
                    minWidth: collapsed && !isMobile ? 0 : { xs: 48, sm: 44 },
                    transition: 'color 0.2s ease-in-out',
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.5rem', sm: '1.4rem' },
                    },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {(!collapsed || isMobile) && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.9375rem',
                      letterSpacing: '0.01em',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {/* User Profile */}
      <Box 
        sx={{ 
          p: collapsed && !isMobile ? 1.5 : 2, 
          borderTop: `1px solid ${mode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(0, 0, 0, 0.08)'}`,
          transition: 'padding 0.2s ease-in-out',
          bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(10px)',
        }}
      >
        {collapsed && !isMobile ? (
          // Collapsed state - show only avatar
          <Tooltip title={`${user?.firstName} ${user?.lastName}`} placement="right" arrow>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: '#0891b2',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 4px 12px rgba(8, 145, 178, 0.4)',
                  },
                }}
              >
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </Avatar>
            </Box>
          </Tooltip>
        ) : (
          // Expanded state - show full profile
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: mode === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              border: `1px solid ${mode === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
              transition: 'all 0.2s',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: mode === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                borderColor: mode === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                transform: 'translateY(-1px)',
              },
            }}
            onClick={handleMenuOpen}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#0891b2',
                fontSize: '0.9rem',
                boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)',
                transition: 'all 0.2s',
              }}
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{ 
                  color: mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary, 
                  fontWeight: 600, 
                  lineHeight: 1.3,
                  fontSize: '0.875rem',
                }}
                noWrap
              >
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: mode === 'dark' ? '#94a3b8' : theme.palette.text.secondary,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 500,
                }}
              >
                {user?.role}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          transition: 'width 0.2s ease-in-out',
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
              transition: 'width 0.2s ease-in-out',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          transition: 'width 0.2s ease-in-out',
        }}
      >
        {/* Top AppBar */}
        <AppBar
          position="sticky"
          sx={{
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            boxShadow: mode === 'dark' 
              ? '0 1px 3px 0 rgb(0 0 0 / 0.3)'
              : '0 1px 3px 0 rgb(0 0 0 / 0.05)',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 56, sm: 64 } }}>
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { md: 'none' },
                color: theme.palette.text.primary,
                minWidth: 44,
                minHeight: 44,
                '&:hover': {
                  bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                },
              }}
              aria-label="menu"
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              sx={{ 
                fontWeight: 600, 
                color: theme.palette.text.primary, 
                flex: 1,
                fontSize: { xs: '1rem', sm: '1.25rem' },
              }}
            >
              {navItems.find(
                (item) =>
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path))
              )?.label || 'Dashboard'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
              <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                <IconButton 
                  onClick={toggleMode} 
                  aria-label="toggle theme"
                  sx={{
                    minWidth: { xs: 44, sm: 40 },
                    minHeight: { xs: 44, sm: 40 },
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  {mode === 'dark' ? (
                    <LightModeIcon />
                  ) : (
                    <DarkModeIcon />
                  )}
                </IconButton>
              </Tooltip>
              
              <IconButton 
                aria-label="notifications"
                sx={{
                  minWidth: { xs: 44, sm: 40 },
                  minHeight: { xs: 44, sm: 40 },
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <NotificationsIcon />
              </IconButton>

              <IconButton 
                onClick={handleMenuOpen}
                sx={{
                  minWidth: { xs: 44, sm: 40 },
                  minHeight: { xs: 44, sm: 40 },
                  p: 0.5,
                }}
              >
                <Avatar
                  sx={{
                    width: { xs: 40, sm: 36 },
                    height: { xs: 40, sm: 36 },
                    bgcolor: theme.palette.primary.main,
                    fontSize: { xs: '0.9rem', sm: '0.85rem' },
                  }}
                >
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {user?.firstName} {user?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Settings</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            bgcolor: 'transparent',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;


