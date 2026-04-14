namespace Adpa.Orchestrator.Models.System;

public record SystemHealthResult(
    bool DbHealthy, 
    bool MessagingHealthy, 
    bool IntelligenceHealthy, 
    int ActiveRituals, 
    string EnvironmentBaseline,
    TimeSpan Uptime);
