#!/usr/bin/env node

/**
 * SharePoint Integration Test Script
 * 
 * This script helps test the SharePoint integration by:
 * 1. Validating Azure app registration configuration
 * 2. Testing Microsoft Graph API connectivity
 * 3. Verifying SharePoint site access
 * 4. Testing document operations
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SharePointTester {
  constructor() {
    this.config = {
      tenantId: '',
      clientId: '',
      clientSecret: '',
      baseUrl: 'http://localhost:5000' // ADPA backend URL
    };
    this.accessToken = null;
  }

  async prompt(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async collectConfiguration() {
    console.log('\n🔧 SharePoint Integration Test Setup');
    console.log('=====================================\n');

    this.config.tenantId = await this.prompt('Enter your Azure Tenant ID: ');
    this.config.clientId = await this.prompt('Enter your Azure Client ID: ');
    this.config.clientSecret = await this.prompt('Enter your Azure Client Secret: ');
    
    const customUrl = await this.prompt(`ADPA Backend URL (${this.config.baseUrl}): `);
    if (customUrl) {
      this.config.baseUrl = customUrl;
    }

    console.log('\n✅ Configuration collected\n');
  }

  async testAzureAuthentication() {
    console.log('🔐 Testing Azure Authentication...');
    
    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('scope', 'https://graph.microsoft.com/.default');
      params.append('grant_type', 'client_credentials');

      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      console.log('✅ Azure authentication successful');
      console.log(`   Token expires in: ${response.data.expires_in} seconds\n`);
      return true;
    } catch (error) {
      console.log('❌ Azure authentication failed');
      console.log(`   Error: ${error.response?.data?.error_description || error.message}\n`);
      return false;
    }
  }

  async testGraphAPIAccess() {
    console.log('📊 Testing Microsoft Graph API Access...');
    
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/sites?$top=5', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const sites = response.data.value || [];
      console.log('✅ Microsoft Graph API access successful');
      console.log(`   Found ${sites.length} SharePoint sites:`);
      
      sites.forEach((site, index) => {
        console.log(`   ${index + 1}. ${site.displayName || site.name} (${site.webUrl})`);
      });
      console.log('');
      
      return sites;
    } catch (error) {
      console.log('❌ Microsoft Graph API access failed');
      console.log(`   Error: ${error.response?.data?.error?.message || error.message}\n`);
      return [];
    }
  }

  async testADPABackend() {
    console.log('🔗 Testing ADPA Backend Connection...');
    
    try {
      // Test basic connectivity
      const healthResponse = await axios.get(`${this.config.baseUrl}/api/health`);
      console.log('✅ ADPA backend is accessible');
    } catch (error) {
      console.log('⚠️  ADPA backend health check failed, but continuing...');
    }

    try {
      // Test SharePoint integration endpoint
      const testResponse = await axios.post(`${this.config.baseUrl}/api/integrations/sharepoint/test`, {
        tenantId: this.config.tenantId,
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (testResponse.data.success) {
        console.log('✅ ADPA SharePoint integration test successful');
      } else {
        console.log('❌ ADPA SharePoint integration test failed');
        console.log(`   Error: ${testResponse.data.error}`);
      }
      console.log('');
      
      return testResponse.data.success;
    } catch (error) {
      console.log('❌ ADPA SharePoint integration test failed');
      console.log(`   Error: ${error.response?.data?.error || error.message}\n`);
      return false;
    }
  }

  async testDocumentOperations(sites) {
    if (sites.length === 0) {
      console.log('⚠️  No sites available for document testing\n');
      return;
    }

    console.log('📄 Testing Document Operations...');
    
    try {
      const site = sites[0]; // Use first site for testing
      console.log(`   Using site: ${site.displayName || site.name}`);

      // Get document libraries
      const drivesResponse = await axios.get(`https://graph.microsoft.com/v1.0/sites/${site.id}/drives`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const drives = drivesResponse.data.value || [];
      console.log(`   Found ${drives.length} document libraries`);

      if (drives.length > 0) {
        const drive = drives[0];
        console.log(`   Testing with library: ${drive.name}`);

        // Get files from the library
        const filesResponse = await axios.get(`https://graph.microsoft.com/v1.0/drives/${drive.id}/root/children?$top=5`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        const files = filesResponse.data.value || [];
        console.log(`   Found ${files.length} files in the library`);
        
        files.forEach((file, index) => {
          if (file.file) { // Only show files, not folders
            console.log(`   ${index + 1}. ${file.name} (${this.formatFileSize(file.size)})`);
          }
        });

        console.log('✅ Document operations test successful\n');
      } else {
        console.log('⚠️  No document libraries found in the site\n');
      }
    } catch (error) {
      console.log('❌ Document operations test failed');
      console.log(`   Error: ${error.response?.data?.error?.message || error.message}\n`);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async generateReport(authSuccess, sites, adpaSuccess) {
    console.log('\n📋 Test Report');
    console.log('===============\n');

    console.log('Configuration:');
    console.log(`  Tenant ID: ${this.config.tenantId}`);
    console.log(`  Client ID: ${this.config.clientId}`);
    console.log(`  Client Secret: ${'*'.repeat(this.config.clientSecret.length)}`);
    console.log(`  ADPA Backend: ${this.config.baseUrl}\n`);

    console.log('Test Results:');
    console.log(`  ✅ Azure Authentication: ${authSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`  ✅ Graph API Access: ${sites.length > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`  ✅ ADPA Integration: ${adpaSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`  ✅ SharePoint Sites Found: ${sites.length}\n`);

    if (authSuccess && sites.length > 0 && adpaSuccess) {
      console.log('🎉 All tests passed! Your SharePoint integration is ready to use.\n');
      console.log('Next steps:');
      console.log('1. Save your configuration in ADPA');
      console.log('2. Start document synchronization');
      console.log('3. Test with real SharePoint content\n');
    } else {
      console.log('⚠️  Some tests failed. Please check the following:\n');
      
      if (!authSuccess) {
        console.log('❌ Azure Authentication Issues:');
        console.log('   - Verify Tenant ID, Client ID, and Client Secret');
        console.log('   - Check that the app registration exists');
        console.log('   - Ensure the client secret hasn\'t expired\n');
      }
      
      if (sites.length === 0) {
        console.log('❌ SharePoint Access Issues:');
        console.log('   - Verify API permissions are granted');
        console.log('   - Check admin consent is provided');
        console.log('   - Ensure Sites.Read.All permission is configured\n');
      }
      
      if (!adpaSuccess) {
        console.log('❌ ADPA Integration Issues:');
        console.log('   - Check that ADPA backend is running');
        console.log('   - Verify the backend URL is correct');
        console.log('   - Check server logs for detailed errors\n');
      }
    }
  }

  async run() {
    try {
      console.log('🚀 ADPA SharePoint Integration Tester');
      console.log('=====================================');
      
      await this.collectConfiguration();
      
      const authSuccess = await this.testAzureAuthentication();
      if (!authSuccess) {
        await this.generateReport(false, [], false);
        return;
      }

      const sites = await this.testGraphAPIAccess();
      await this.testDocumentOperations(sites);
      const adpaSuccess = await this.testADPABackend();
      
      await this.generateReport(authSuccess, sites, adpaSuccess);
      
    } catch (error) {
      console.log('\n❌ Test failed with unexpected error:');
      console.log(error.message);
    } finally {
      rl.close();
    }
  }
}

// Run the tester
if (require.main === module) {
  const tester = new SharePointTester();
  tester.run().catch(console.error);
}

module.exports = SharePointTester;
