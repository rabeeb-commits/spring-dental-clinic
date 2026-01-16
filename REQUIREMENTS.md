# System Requirements

## Hardware Requirements

### Minimum Requirements
- **Processor**: 2 GHz dual-core processor
- **RAM**: 4 GB
- **Storage**: 2 GB free disk space
- **Network**: Internet connection for initial setup and updates

### Recommended Requirements
- **Processor**: 3 GHz quad-core processor or better
- **RAM**: 8 GB or more
- **Storage**: 10 GB free disk space (for database and file uploads)
- **Network**: Stable broadband connection

## Software Requirements

### Operating Systems

#### Windows
- Windows 10 (64-bit) or higher
- Windows Server 2016 or higher

#### Linux
- Ubuntu 20.04 LTS or higher
- Debian 10 or higher
- CentOS 8 or higher
- RHEL 8 or higher
- Other modern Linux distributions with systemd

#### macOS
- macOS 10.15 (Catalina) or higher
- macOS 11 (Big Sur) or higher (recommended)

### Runtime Environment

#### Node.js
- **Version**: 18.0.0 or higher
- **Download**: https://nodejs.org/
- **Recommended**: LTS (Long Term Support) version

#### npm
- **Version**: 9.0.0 or higher
- **Included**: Comes with Node.js installation

### Database

#### PostgreSQL
- **Version**: 12.0 or higher
- **Recommended**: PostgreSQL 14 or 15
- **Download**: https://www.postgresql.org/download/
- **Port**: 5432 (default)

### Web Browsers (Client-Side)

#### Supported Browsers
- **Google Chrome**: Latest 2 versions
- **Mozilla Firefox**: Latest 2 versions
- **Microsoft Edge**: Latest 2 versions
- **Safari**: Latest 2 versions (macOS/iOS)

#### Browser Features Required
- JavaScript enabled
- Local Storage support
- Cookies enabled
- Modern ES6+ support

#### Minimum Browser Versions
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

## Network Requirements

### Ports

#### Required Ports
- **5000**: Backend API server (configurable)
- **5173**: Frontend development server (configurable)
- **5432**: PostgreSQL database (default)

#### Firewall Configuration
- Allow inbound connections on port 5000 (production)
- Allow outbound connections to PostgreSQL (port 5432)
- For development, allow port 5173

### Network Connectivity
- Internet connection for:
  - Initial package installation
  - Database setup
  - Updates and dependencies

## Development vs Production

### Development Environment
- Node.js 18+
- npm 9+
- PostgreSQL 12+
- Modern web browser
- Text editor or IDE (optional)

### Production Environment
- All development requirements plus:
- Process manager (PM2, systemd, NSSM)
- Reverse proxy (Nginx, Apache) - recommended
- SSL/TLS certificates - recommended
- Automated backup solution - recommended
- Monitoring tools - recommended

## Additional Software (Optional)

### Development Tools
- Git (for version control)
- VS Code or similar IDE
- PostgreSQL client tools (pgAdmin, DBeaver)

### Production Tools
- Nginx or Apache (reverse proxy)
- PM2 or similar (process manager)
- Certbot (SSL certificates)
- Backup tools (pg_dump, rsync)

## Cloud Deployment

### Supported Platforms
- AWS (EC2, RDS)
- Google Cloud Platform
- Microsoft Azure
- DigitalOcean
- Heroku
- Railway
- Render

### Container Support
- Docker
- Docker Compose
- Kubernetes (with configuration)

## Performance Considerations

### Small Clinic (< 1000 patients)
- Minimum requirements sufficient
- Single server deployment

### Medium Clinic (1000-5000 patients)
- Recommended requirements
- Consider separate database server
- Load balancing for high traffic

### Large Clinic (5000+ patients)
- Exceed recommended requirements
- Separate database server
- Load balancing
- CDN for static assets
- Database replication

## Security Requirements

### Production Deployment
- HTTPS/SSL certificates
- Firewall configuration
- Regular security updates
- Strong database passwords
- Secure JWT secret keys
- Regular backups
- Access control and authentication

## Storage Considerations

### Database Storage
- Initial: ~100 MB
- Growth: ~10-50 MB per 1000 patients
- Includes: Patient data, appointments, invoices, documents

### File Uploads
- X-rays, scans, documents
- Estimate: 1-5 MB per patient
- Configure `MAX_FILE_SIZE` in environment

### Log Files
- Application logs: ~10-50 MB per month
- Error logs: Varies by usage
- Location: `backend/logs/`

## Scalability

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Upgrade database server
- Add more storage

### Horizontal Scaling
- Multiple application servers
- Load balancer
- Database replication
- Separate file storage

## Support and Compatibility

### End of Life
- Node.js versions below 18: Not supported
- PostgreSQL versions below 12: Not supported
- Internet Explorer: Not supported

### Testing
- Application tested on:
  - Windows 10/11
  - Ubuntu 20.04/22.04
  - macOS 11/12/13

## Questions?

If your system doesn't meet these requirements or you have questions:
1. Check [INSTALLATION.md](INSTALLATION.md) for detailed setup
2. Review [Troubleshooting](INSTALLATION.md#troubleshooting) section
3. Verify all prerequisites are correctly installed
