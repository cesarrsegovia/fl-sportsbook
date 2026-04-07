import axios from 'axios';

async function testFullFixture() {
    const leagueCode = 'conmebol.libertadores';
    
    // Test with year and limit
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/scoreboard?dates=2026&limit=300`;
    
    try {
        const { data } = await axios.get(url);
        console.log(`Events found with limit=300: ${data.events?.length}`);
    } catch(e) {
        console.error("Error fetching", e.message);
    }
}
testFullFixture();
