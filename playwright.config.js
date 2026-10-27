import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'browser.test.js',workers:1,use:{baseURL:'http://127.0.0.1:4319',headless:true},webServer:{command:'node scripts/server.js',url:'http://127.0.0.1:4319',env:{PORT:'4319'},reuseExistingServer:false},reporter:'list'});
