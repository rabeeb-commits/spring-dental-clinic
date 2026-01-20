import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Paper, Typography, Alert, Button } from '@mui/material';
import { Download as DownloadIcon, Print as PrintIcon } from '@mui/icons-material';

interface UPIQRCodeProps {
  upiId: string;
  amount: number;
  payeeName: string;
  transactionNote?: string;
  size?: number;
}

const UPIQRCode: React.FC<UPIQRCodeProps> = ({
  upiId,
  amount,
  payeeName,
  transactionNote,
  size = 200,
}) => {
  // Validate UPI ID format
  const isValidUpiId = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId);

  if (!upiId || !isValidUpiId) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Please configure a valid UPI ID in Settings. Format: name@upi, name@paytm, etc.
      </Alert>
    );
  }

  if (amount <= 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Amount must be greater than 0 to generate QR code.
      </Alert>
    );
  }

  // Generate UPI payment URL
  const upiUrl = React.useMemo(() => {
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: amount.toFixed(2),
      cu: 'INR',
    });

    if (transactionNote) {
      params.append('tn', transactionNote);
    }

    return `upi://pay?${params.toString()}`;
  }, [upiId, payeeName, amount, transactionNote]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const handleDownload = () => {
    const svg = document.getElementById('upi-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `UPI-QR-${amount}-${Date.now()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>UPI Payment QR Code</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              padding: 40px; 
              font-family: Arial, sans-serif;
            }
            .qr-container { 
              text-align: center; 
              margin: 20px 0;
            }
            .amount { 
              font-size: 24px; 
              font-weight: bold; 
              margin: 20px 0; 
              color: #0891b2;
            }
            .upi-id { 
              font-size: 16px; 
              margin: 10px 0; 
              color: #64748b;
            }
            .instructions { 
              margin-top: 20px; 
              color: #64748b; 
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="amount">${formatCurrency(amount)}</div>
            <div id="qr-print"></div>
            <div class="upi-id">${upiId}</div>
            <div class="instructions">
              Scan with Google Pay, PhonePe, Paytm, or any UPI app
            </div>
          </div>
          <script>
            const qrSvg = \`${document.getElementById('upi-qr-code')?.outerHTML || ''}\`;
            document.getElementById('qr-print').innerHTML = qrSvg;
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: '#ffffff',
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1, color: '#0891b2' }}>
        {formatCurrency(amount)}
      </Typography>

      <Box
        sx={{
          p: 2,
          bgcolor: '#ffffff',
          borderRadius: 2,
          border: '2px solid #e2e8f0',
          mb: 2,
        }}
      >
        <QRCodeSVG
          id="upi-qr-code"
          value={upiUrl}
          size={size}
          level="M"
          includeMargin={true}
        />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
        {upiId}
      </Typography>

      {transactionNote && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          Invoice: {transactionNote}
        </Typography>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textAlign: 'center', mb: 2, maxWidth: 250 }}
      >
        Scan with Google Pay, PhonePe, Paytm, or any UPI app
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          Download
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print
        </Button>
      </Box>
    </Paper>
  );
};

export default UPIQRCode;
