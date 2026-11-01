// Optional browser smoke test: PLAYWRIGHT_PATH=/path/to/playwright node test/qiroah-ui.cjs
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {randomUUID} = require('node:crypto');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const password=randomUUID();
const server=spawn(process.execPath,['server.js'],{env:{...process.env,DB_PATH:'/tmp/qiroah-test.db',ADMIN_PASSWORD:password,PORT:'0'},stdio:['ignore','pipe','pipe']});
(async()=>{
  let browser;
  try{
    const url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(new Error('Server startup timeout')),15000);server.stdout.on('data',b=>{output+=b;const m=output.match(/http:\/\/localhost:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});server.once('exit',code=>reject(new Error(`Server exit ${code}`)));});
    browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
    const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'/admin.html');await page.fill('#password',password);await page.click('#login-form button');await page.click('#q-new');
    const title='Qiroah browser '+randomUUID(),text='كَتَبَ  زَيْدٌ\nدَرْسًا';
    await page.fill('#q-title',title);await page.fill('#q-text',text);
    assert.equal(await page.locator('#q-preview').textContent(),text);
    await page.locator('#q-preview span').first().click();await page.fill('#q-value','madhi');await page.click('#q-add');
    await page.selectOption('#q-kind','kalimat');await page.selectOption('#q-kalimat',"fi'l");await page.click('#q-add');
    // Select exact combining mark inside the second word via browser Range.
    await page.evaluate(()=>{const n=document.querySelectorAll('#q-preview span')[1].firstChild;const r=document.createRange();r.setStart(n,n.length-1);r.setEnd(n,n.length);const s=getSelection();s.removeAllRanges();s.addRange(r);});
    await page.waitForTimeout(50);await page.click('#q-selection');await page.selectOption('#q-kind','tanda_irob');await page.fill('#q-value','dhammah');await page.fill('#q-note','Tanda rafa‘ pada fa‘il.');await page.click('#q-add');
    await page.locator('#q-editor button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#q-status').textContent.includes('tersimpan'));
    const row=page.locator('#q-list .q-row').filter({hasText:title});await row.locator('[data-q-edit]').click();assert.equal(await page.inputValue('#q-text'),text);assert.equal(await page.locator('#q-annotations .q-row').count(),3);
    const player=await browser.newPage();player.on('pageerror',e=>errors.push(e.message));await player.goto(url);await player.click('#qp-refresh');await player.getByRole('button',{name:title,exact:true}).click();
    await player.locator('#qp-practice').waitFor({state:'visible'});assert.equal(await player.locator('#qp-text').textContent(),text);assert.equal(await player.locator('#qp-question').isVisible(),false);
    await player.locator('#qp-text .q-highlight').first().click();await player.locator('#qp-options').getByRole('button',{name:'madhi',exact:true}).click();assert.match(await player.locator('#qp-score').textContent(),/Skor 100 · Streak 1/);
    await player.click('#qp-next');await player.locator('#qp-options').getByRole('button',{name:"fi'l",exact:true}).click();assert.match(await player.locator('#qp-score').textContent(),/Skor 200 · Streak 2/);
    await player.click('#qp-next');await player.locator('#qp-text .q-highlight').last().click();await player.locator('#qp-options button').filter({hasText:'fathah'}).count().then(async n=>{if(n)await player.getByRole('button',{name:'fathah',exact:true}).click();else await player.locator('#qp-options button').filter({hasNotText:'dhammah'}).first().click();});
    assert.match(await player.locator('#qp-feedback').textContent(),/Tanda rafa‘/);assert.match(await player.locator('#qp-score').textContent(),/Skor 200 · Streak 0/);
    await player.setViewportSize({width:390,height:844});assert.equal(await player.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    // Edit/delete annotation, persist, then cascade-delete the text through UI.
    await page.locator('[data-q-span="0"]').click();await page.fill('#q-value','amr');await page.click('#q-add');await page.locator('[data-q-remove="2"]').click();await page.locator('#q-editor button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#q-status').textContent.includes('tersimpan'));
    await row.locator('[data-q-edit]').click();assert.equal(await page.locator('#q-annotations .q-row').count(),2);assert.match(await page.locator('#q-annotations').textContent(),/amr/);
    page.once('dialog',d=>d.accept());await row.locator('[data-q-delete]').click();await row.waitFor({state:'detached'});
    assert.deepEqual(errors,[]);console.log('PASS browser: admin create/select/annotate/save/edit/delete; player multi-annotation, correct/wrong, score/streak, harakat, mobile overflow, no JS errors');
  } finally {await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
