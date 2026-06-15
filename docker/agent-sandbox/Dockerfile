# Use the official .NET 10 SDK (Preview)
# If 10.0 is not officially tagged without preview, we fallback to installing it
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview

# Install Node.js v20 and pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# Install other agent orchestration tools
RUN apt-get install -y git jq curl make build-essential

WORKDIR /workspace

# Environment tweaks for fast agent runs
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
ENV DOTNET_NOLOGO=1

# Define the entrypoint script
CMD ["/bin/bash"]
