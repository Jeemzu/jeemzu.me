import { Box } from '@mui/material';

const VIDEO_ID = 'ei_5vYm5e1w';
const EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}?rel=0&loop=1&playlist=${VIDEO_ID}`;

export default function MemorialPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)',
        px: 2,
        py: 4,
      }}
    >
      <Box
        component="iframe"
        src={EMBED_URL}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        sx={{
          width: '100%',
          maxWidth: 960,
          aspectRatio: '16 / 9',
          border: 'none',
          borderRadius: 2,
          boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        }}
      />
    </Box>
  );
}
