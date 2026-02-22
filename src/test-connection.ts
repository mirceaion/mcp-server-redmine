import axios from 'axios';

const REDMINE_URL = process.env.REDMINE_URL || '';
const REDMINE_API_KEY = process.env.REDMINE_API_KEY || '';

async function testConnection() {
  console.log('Testing Redmine connection...\n');
  console.log(`URL: ${REDMINE_URL}`);
  console.log(`API Key: ${REDMINE_API_KEY.substring(0, 8)}...`);
  console.log('');

  try {
    const response = await axios.get(`${REDMINE_URL}/projects.json`, {
      headers: {
        'X-Redmine-API-Key': REDMINE_API_KEY,
      },
    });

    console.log('✅ Connection successful!\n');
    console.log(`Found ${response.data.projects.length} projects:\n`);
    
    response.data.projects.forEach((p: any) => {
      console.log(`  - ID ${p.id}: ${p.name} (${p.identifier})`);
    });
    
    console.log('\n✅ MCP server is ready to use!');
  } catch (error: any) {
    console.error('❌ Connection failed!\n');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.statusText}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    console.error('\nCheck your REDMINE_URL and REDMINE_API_KEY');
    process.exit(1);
  }
}

testConnection();
