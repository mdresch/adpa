namespace Adpa.Orchestrator.Clients;

/// <summary>
/// ADR-012 PR1: relays the caller's own bearer token to Node's GET /api/v1/auth/me,
/// which now also resolves the caller's active department memberships
/// (resolveCurrentUserDepartments, see adpa-federated-capability-ownership).
/// Same GetRelayAsync pattern as CapabilityRegistryClient's ListPendingOverridesAsync/
/// ListPendingExceptionsAsync -- deliberately not a new proxy shape.
/// </summary>
public class CurrentUserClient(HttpClient http)
{
    public Task<(int StatusCode, string Body)> GetProfileAsync(
        string? bearerToken,
        CancellationToken cancellationToken = default) =>
        GetRelayAsync("/api/v1/auth/me", bearerToken, cancellationToken);

    private async Task<(int StatusCode, string Body)> GetRelayAsync(string path, string? bearerToken, CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, path);

        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            httpRequest.Headers.TryAddWithoutValidation("Authorization", bearerToken);
        }

        var response = await http.SendAsync(httpRequest, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        return ((int)response.StatusCode, body);
    }
}
