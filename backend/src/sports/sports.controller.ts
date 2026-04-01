import { Controller, Get, Param } from '@nestjs/common';
import { SportsService } from './sports.service';

@Controller('sports')
export class SportsController {
    constructor(private readonly sportsService: SportsService) { }

    @Get(':league')
    findAll(@Param('league') league: string) {
        return this.sportsService.findAll(league);
    }

    @Get(':league/standings')
    getStandings(@Param('league') league: string) {
        return this.sportsService.getStandings(league);
    }
}
