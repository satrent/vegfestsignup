const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/environments/environment.prod.ts');

const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY;

if (!stripeKey) {
    console.log('No STRIPE_PUBLISHABLE_KEY found in environment variables. Skipping environment.prod.ts generation.');
    return;
}

const envConfigFile = `export const environment = {
    production: true,
    apiUrl: '/api',
    stripePublishableKey: '${stripeKey}'
};
`;

fs.writeFileSync(targetPath, envConfigFile);

console.log(`Output generated at ${targetPath}`);
