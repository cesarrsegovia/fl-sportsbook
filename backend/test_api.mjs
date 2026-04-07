import axios from 'axios';

async function checkAPI() {
    const leagueCode = 'conmebol.libertadores';
    const endpoints = {
        teams: `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/teams`,
        scoreboard: `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueCode}/scoreboard`, // For fixture
        standings: `https://site.api.espn.com/apis/v2/sports/soccer/${leagueCode}/standings` // For groups/posiciones
    };

    console.log("Checking API for Copa Libertadores...");

    try {
        let teamsAvailable = false;
        try {
            const teamsRes = await axios.get(endpoints.teams);
            teamsAvailable = teamsRes.data?.sports?.[0]?.leagues?.[0]?.teams?.length > 0 || false;
            console.log(`Teams available: ${teamsAvailable} (${teamsRes.data?.sports?.[0]?.leagues?.[0]?.teams?.length} teams)`);
        } catch(e) {
             console.log(`Teams endpoint failed: ${e.message}`);
        }
        
        let scoreboardAvailable = false;
        try {
            const scoreboardRes = await axios.get(endpoints.scoreboard);
            scoreboardAvailable = scoreboardRes.data?.events?.length > 0 || false;
            console.log(`Fixture/Events available: ${scoreboardAvailable} (${scoreboardRes.data?.events?.length} events in current scoreboard)`);
        } catch(e) {
            console.log(`Scoreboard endpoint failed: ${e.message}`);
        }

        let standingsAvailable = false;
        try {
            const standingsRes = await axios.get(endpoints.standings);
            const hasGroups = standingsRes.data?.children?.length > 0;
            console.log(`Standings/Groups available: ${hasGroups}`);
            if (hasGroups) {
                console.log(`  Sample Group Name: ${standingsRes.data.children[0].name}`);
                const teamsInGroup = standingsRes.data.children[0].standings?.entries || standingsRes.data.children[0].entries || [];
                console.log(`  Sample Teams in Group: ${teamsInGroup.length}`);
            } else if (standingsRes.data?.standings?.entries) {
                console.log(`  Standings exist but not grouped. Rows: ${standingsRes.data.standings.entries.length}`);
            }
        } catch(e) {
            console.log(`Standings endpoint failed: ${e.message}`);
        }

    } catch (e) {
        console.error("Unknown Execution Error", e.message);
    }
}
checkAPI();
