const fs = require('fs');
try {
  const content = fs.readFileSync('node_modules/better-auth/dist/plugins/organization/routes/organization.mjs', 'utf8');
  console.log("length:", content.length);
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('/organization/create"') || l.includes('createOrganization')) {
      console.log("MATCH", i);
    }
  });
  // let's grab the endpoint code around the createOrganization match
  const focus = lines.findIndex(l => l.includes('/organization/create"'));
  if (focus !== -1) {
    for(let i = focus; i < focus + 150; i++) {
      if (lines[i] && lines[i].includes('team')) console.log(i, lines[i]);
    }
  }
} catch(e) {
  console.error(e);
}
