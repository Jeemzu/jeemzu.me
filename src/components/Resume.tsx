import { Typography, Button, Grid } from "@mui/material";
import { FaDownload } from "react-icons/fa6";

const Resume = () => {
    return (
        <Grid container spacing={4}>
            <Grid size={12}>
                <Typography
                    variant="h3"
                    component="h2"
                    gutterBottom
                    sx={{
                        textAlign: 'center',
                        mb: 4,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        position: 'relative',
                    }}
                >
                    RESUME & CV
                </Typography>
            </Grid>

            <Grid size={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ maxWidth: '800px', textAlign: 'center', mb: 3 }}>
                    Here you can download my resume or view my full CV online. The resume covers my professional
                    experience, education, and key skills in a concise format.
                </Typography>

                <Button
                    variant="contained"
                    startIcon={<FaDownload />}
                    href="/james_friedenberg_resume.pdf"
                    target="_blank"
                    sx={{ mb: 5 }}
                >
                    Download Resume (PDF)
                </Button>
            </Grid>
        </Grid>
    );
};

export default Resume;