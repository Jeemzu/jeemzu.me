import { Container } from '@mui/material';
import RPGContainer from '../../components/rpg/RPGContainer';

const RPGPage = () => {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <RPGContainer />
        </Container>
    );
};

export default RPGPage;
