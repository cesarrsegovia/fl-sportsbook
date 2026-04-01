import { SportsService } from './sports.service';
export declare class SportsController {
    private readonly sportsService;
    constructor(sportsService: SportsService);
    findAll(league: string): Promise<import("@sportsbook/types").Match[]>;
    getStandings(league: string): Promise<import("@sportsbook/types").TeamRanking[]>;
}
