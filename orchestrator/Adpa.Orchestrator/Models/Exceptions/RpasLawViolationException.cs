namespace Adpa.Orchestrator.Models.Exceptions;

public sealed class RpasLawViolationException : Exception
{
    public string RuleName { get; }

    public RpasLawViolationException(string ruleName, string message)
        : base(message)
    {
        RuleName = ruleName;
    }
}
