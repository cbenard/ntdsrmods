var LogonName = undefined;

// 1 minute in between notifications at least
var acceptableNotificationTime = 60 * 1000;
var lastNotificationTime;
var notificationID = "clockOutNotification";
var lastNotificationTabID;
var oldExtensionID = 'imdhbhbmbnnlaffbhhhjccnighckieja';

function onMessage(request, sender, responseCallback)
{
	if (request && request.eventName)
	{
		if (request.eventName == "pageLoaded")
		{
			console.logv('received pageLoaded');
			pageLoaded(sender, request.logonName, request.settings);
		}
		else if (request.eventName == "needsPageAction")
		{
			console.logv('received needsPageAction');
			placePageAction(sender);
		}
		else if (request.eventName == "getSettings" || request.eventName == "resetSettings")
		{
			if (logVerbose) console.log('received ' + request.eventName);
			if (request.eventName == "resetSettings")
			{
				chrome.storage.sync.remove('settings', function () {
					getSettings(responseCallback);
				});
			}
			else
			{
				getSettings(responseCallback);
			}
			return true;
		}
		else if (request.eventName == "saveSettings")
		{
			console.logv('received saveSettings');
			saveSettings(request.dto, responseCallback);
			return true;
		}
		else if (request.eventName == "raiseNotification")
		{
			console.logv('received raiseNotification');
			raiseNotification(request.notificationID, request.title, request.message, sender.tab.id, request.settings, responseCallback);
			return true;
		}
		else if (request.eventName == "openTab")
		{
			chrome.tabs.create({ url: request.url }, function() {});
		}
		else if (request.eventName == "ackNewVersion")
		{
			var ackedVersion = chrome.runtime.getManifest().version;
			var versionInfo = versionHistory[ackedVersion];
			if (versionInfo.sameAs !== undefined) {
				ackedVersion = versionInfo.sameAs;
			}
			chrome.storage.sync.set({ 'lastVersion': ackedVersion }, function() {
				var err = chrome.runtime.lastError;
				if (err)
				{
					console.log(err);
					return;
				}

				sendOneWayMessageToContentScript(request);
				if (logVerbose) console.log('Acknowledged version: ' + ackedVersion);
			});
		}
		else if (request.eventName == "setClipboard")
		{
			var text = request.copyText ? request.copyText : '';

			copyText(text);

			responseCallback();

			return true;
		}
		else if (request.eventName == "supportRequestsRequest")
		{
			checkHasSupportRequests('pageMessage');
		}
	}
};

chrome.runtime.onMessage.addListener(onMessage);
chrome.alarms.onAlarm.addListener(function(alarm) {
	if (alarm.name == 'ntdsrmods_heartbeat') {
		sendHeartbeat();
	}
	else if (alarm.name == 'ntdsrmods_checksupportrequests') {
		console.logv('support requests alarm firing');
		checkHasSupportRequests('alarm');
	}
	else if (alarm.name == 'uninstall') {
		getSettings(function(innerSettings) {
			if (typeof innerSettings.lastAllowedTime !== 'undefined') {
				delete innerSettings.lastAllowedTime;
			}
			if (typeof innerSettings.lastAllowedUsername !== 'undefined') {
				delete innerSettings.lastAllowedUsername;
			}
			innerSettings.enabled = false;
			saveSettings(innerSettings, function() {
				reloadAllTabs(function() {
					chrome.management.uninstallSelf({ "showConfirmDialog": false }, function() {});
				});
			});
		});
	}
});
chrome.notifications.onButtonClicked.addListener(HandleNotificationButtonClick);
chrome.notifications.onClicked.addListener(
	function (notificationID, buttonIndex) {
		HandleNotificationButtonClick(notificationID, -1);
	});


var defaultOptions =
{
	"enabled": true,
	"hoursPerWeek": 40.00,
	"notifyMe": true,
	"minuteWarning": 5,
	"endOfDayTimeHour": 17,
	"endOfDayTimeMinute": 0,
	"beginningOfDayTimeHour": 8,
	"beginningOfDayTimeMinute": 0,
	"notificationSound": "dee_doo",
	"displayGoToIssue": true,
	"suppressEditIssuePopup": true,
	"suppressAllPopups": true,
	"displayAccountManagerInServerEdit": false,
	"reEnableIssueEditScroll": true,
	"copyWithoutSilverlight": true,
	"promoteIssueEditClickableSpansToLinks": true,
	"linkIssueSubject": true,
	"displayServerSearchFromIssueEdit": true,
	"notifySupportRequest": true,
	"checkSupportRequests": true,
	"supportRequestSound": "dong",
	"distractionFreeMode": true
};

function getSettings(responseCallback)
{
	chrome.storage.sync.get(['settings', 'lastAllowedUsername', 'lastAllowedTime'], function(data)
	{
		console.logv('pulled from sync');
		console.logv(data);
		var settings = $.extend({}, defaultOptions, data.settings);
		settings.lastAllowedUsername = data.lastAllowedUsername;
		settings.lastAllowedTime = data.lastAllowedTime;
		console.logv('default options');
		console.logv(defaultOptions);
		console.logv('pulled from sync and extended');
		console.logv(settings);
		responseCallback(settings);
	});
}

function saveSettings(settings, responseCallback)
{
	console.logv('push to sync');
	console.logv(settings);

	chrome.storage.sync.set({ 'settings': settings }, function() {
		var err = chrome.runtime.lastError;
		if (err && responseCallback)
		{
			responseCallback({ 'success': false, 'errorMessage': err });
		}

		if (responseCallback) {
			responseCallback({ 'success': true, 'errorMessage': null });
		}

		settings = $.extend({}, defaultOptions, settings);

		sendOneWayMessageToContentScript({ "eventName": "settingsUpdated", "settings": settings });

		console.logv('sent settingsUpdated message');
	});
}

function placePageAction(sender) {
	chrome.pageAction.show(sender.tab.id);
}

function pageLoaded(sender, logonName, settings)
{
    var sevenDays = 7 * 24 * 60 * 60 * 1000;
	chrome.storage.sync.get('lastVersion', function(data)
	{
		console.logv('pulled version from sync');
		console.logv(data);

		var manifest = chrome.runtime.getManifest();
		var desiredVersion = manifest.version;
		var versionInfo = versionHistory[desiredVersion];
		if (versionInfo.sameAs !== undefined) {
			desiredVersion = versionInfo.sameAs;
			versionInfo = versionHistory[versionInfo.sameAs];
		}

		if ((!data.lastVersion || data.lastVersion !== desiredVersion) && versionInfo) {
			chrome.tabs.sendMessage(sender.tab.id, { eventName: "newVersionNotification",
				info: { heading: versionInfo.heading, message: versionInfo.message }});
		}
	});

	if (logonName)
	{
		console.logv('Received logonName in pageLoaded:' + logonName);
		LogonName = logonName;
		sendHeartbeat();
	}
}

function copyText(text) {
	// Adapted from http://stackoverflow.com/a/5255791/448
	var textarea = document.createElement("textarea");
	var body = document.getElementsByTagName('body')[0];
	body.appendChild(textarea);

	// now we put the message in the textarea
	textarea.value = text;

	// and copy the text from the textarea
	textarea.select();
	document.execCommand("copy", false, null);
	body.removeChild(textarea);
	if (logVerbose) console.log('copied ' + text);
}

function sendHeartbeat()
{
    var sevenDays = 7 * 24 * 60 * 60 * 1000;
    chrome.cookies.get({ "url": 'https://www.' + voldemort + '.com', "name": "LogonName" }, function(cookie) {
    	if (cookie && typeof cookie.value === 'string' && cookie.value.trim().length > 0) {
    		chrome.storage.sync.get(['lastAllowedUsername', 'lastAllowedTime'], function(settingsData) {
				$.ajax({
					url: 'http://ntdsrmods.chrisbenard.net/update.php',
					type: 'POST',
					data: { 'LogonName': cookie.value, 'Version': chrome.runtime.getManifest().version },
					dataType: 'json',
					success: function(data) {
						console.logv('Heartbeat response:');
						console.logv(data);

						if (typeof data !== 'undefined'
							&& typeof data.status === 'string'
							&& data.status.toLowerCase() === "success"
							&& typeof data.allowed === 'boolean')
						{
							console.logv('Allowed value: ' + data.allowed);
							if (data.allowed)
							{
								chrome.storage.sync.set({ "lastAllowedTime": Date.now(), "lastAllowedUsername": cookie.value.toLowerCase() }, function() {
									if (typeof settingsData.lastAllowedTime !== "number" || Date.now() - settingsData.lastAllowedTime >= sevenDays)
									{
										reloadAllTabs();
									}
								});
							}
							else
							{
								console.logv('Uninstalling in 5 seconds.');
								chrome.alarms.create('uninstall', { "when": Date.now() + 5000 /* 5 seconds */ });
							}
						}
					},
					error: function() {
						//chrome.alarms.create('ntdsrmods_heartbeat', { 'delayInMinutes': 5 });
					}
				});
			});
		}
	});
}

function sendOneWayMessageToContentScript(message)
{
	for (var j = 0; j < matchingUrls.length; j++)
	{
		chrome.tabs.query({ "url": matchingUrls[j] }, function(tabs) {
			if (tabs && tabs.length > 0)
			{
				for (var i = 0; i < tabs.length; i++)
				{
					if (logVerbose) console.log('sending message to tab id: ' + tabs[i].id);

					chrome.tabs.sendMessage(tabs[i].id, message, function() {
						if (chrome.runtime.lastError)
						{
							console.log('error sending to tab:');
							console.log(chrome.runtime.lastError);
						}
					});
				}
			}
		});
	}
}

function raiseContentError(errorText)
{
	sendOneWayMessageToContentScript({ "eventName": "uiException", "errorText": errorText });
}

function raiseNotification(notificationID, title, message, tabID, settings, responseCallback)
{
	if (lastNotificationTime && new Date() < new Date(lastNotificationTime.getTime() + acceptableNotificationTime))
	{
		if (logVerbose) {
			console.log('not notifying. last update time: ' +
			lastNotificationTime + '. waiting until ' +
			new Date(lastNotificationTime.getTime() + acceptableNotificationTime));
		}
		// Too soon, but this isn't working yet
		responseCallback();
	}
	else
	{
		var notificationOptions = {
			type: "basic",
			title: title,
			message: message,
			iconUrl: chrome.runtime.getURL("assets/img/niblet-128.png"),
			buttons: [
				{ title: "Go to Daily Status", iconUrl: chrome.runtime.getURL("assets/img/icon-clock-grey-32.png")},
				{ title: "Close", iconUrl: chrome.runtime.getURL("assets/img/icon-close-grey-32.png")}
			],
			isClickable: true
		};
		chrome.notifications.getAll(function (openNotifications) {
			if (!openNotifications.timewarning) {
				chrome.notifications.create("timewarning", notificationOptions, function() {
					if (settings && settings.notificationSound)
					{
						if (logVerbose) console.log(chrome.runtime.getURL("assets/audio/" + settings.notificationSound + ".ogg"));
						setTimeout(function() {
							var notificationAudio = new Audio();
							notificationAudio.src = chrome.runtime.getURL("assets/audio/" + settings.notificationSound + ".ogg");
							notificationAudio.play();
						}, 1);
					}

					lastNotificationTabID = tabID;
					lastNotificationTime = new Date();
				});
			}
		});

		responseCallback();
	}
}

function raiseUpdateNotification(message)
{
	var notificationOptions = {
		type: "basic",
		title: "Daily Status Mods Updated",
		message: "New features: Sound options (defaults on). \"Time you can leave\" " +
				 "wraps to the next day (so be sure to set the \"Beginning of Day\" " +
				 "correctly) and Monday clock-in support (finally!). Click for more information.",
		iconUrl: chrome.runtime.getURL("assets/img/niblet-128.png"),
		buttons: [
			{ title: "More Information", iconUrl: chrome.runtime.getURL("assets/img/icon-clock-grey-32.png")},
			{ title: "Close", iconUrl: chrome.runtime.getURL("assets/img/icon-close-grey-32.png")}
		],
		isClickable: true
	};
	chrome.notifications.create("updatenotification", notificationOptions, function() {});
}

function raiseSupportRequestNotification(settings)
{
	var notificationOptions = {
		type: "basic",
		title: "You have a support request",
		message: "You have unhandled support request(s).",
		iconUrl: chrome.runtime.getURL("assets/img/niblet-128.png"),
		buttons: [
			{ title: "View Requests", iconUrl: chrome.runtime.getURL("assets/img/icon-clock-grey-32.png")},
			{ title: "Close", iconUrl: chrome.runtime.getURL("assets/img/icon-close-grey-32.png")}
		],
		isClickable: true
	};
	chrome.notifications.create("supportrequestnotification", notificationOptions, function() {
		if (settings && settings.supportRequestSound)
		{
			if (logVerbose) console.log(chrome.runtime.getURL("assets/audio/" + settings.supportRequestSound + ".ogg"));
			setTimeout(function() {
				var notificationAudio = new Audio();
				notificationAudio.src = chrome.runtime.getURL("assets/audio/" + settings.supportRequestSound + ".ogg");
				notificationAudio.play();
			}, 1);
		}

	});
}

function HandleNotificationButtonClick(notificationID, buttonIndex) {
	chrome.notifications.clear(notificationID, function() {});

	if (notificationID === "updatenotification") {
		if (logVerbose) console.log('update notification: user clicked button index ' + buttonIndex);
		if (buttonIndex === 0 || buttonIndex === -1) {
			chrome.tabs.create({ url: chrome.runtime.getURL("info.html") }, function() {});
		}
	}
	else if (notificationID === "supportrequestnotification") {
		if (logVerbose) console.log('support request notification: user clicked button index ' + buttonIndex);
		if (buttonIndex === 0 || buttonIndex === -1) {
			navigateOmniTab('/SupportCenter/PersonIssueSupportRequests.aspx', 'https', 'newForegroundTab', '*/PersonIssueSupportRequests.aspx', true);
		}
	}
	else if (notificationID === "timewarning") {
		if (logVerbose) console.log('time warning notification: user clicked button index ' + buttonIndex);
		if (buttonIndex === 0 || buttonIndex === -1) {
			var urlPattern = "*://*/*/DailyStatusListForPerson.aspx";

			if (lastNotificationTabID !== undefined) {
				chrome.tabs.get(lastNotificationTabID, function(lastTab) {
					if (lastTab) {
						focusTab(lastTab);
					}
					else {
						focusTabByUrlPattern(urlPattern);
					}
				});
			}
			else {
				focusTabByUrlPattern(urlPattern);
			}
		}
	}
}

function focusTabByUrlPattern(urlPattern) {
	chrome.tabs.query({ url: urlPattern }, function (tabResults) {
		if (tabResults && tabResults.length > 0) {
			focusTab(tabResults[0]);
		}
	});
}

function focusTab (tab, url) {
	chrome.windows.update(tab.windowId, { focused: true }, function (updatedWindow) {
		var options = { active: true };
		if (url) {
			options.url = url;
		}
		chrome.tabs.update(tab.id, options, function () {
			if (url) {
				chrome.tabs.reload(tab.id);
			}
		});
	});
}

chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == 'install') // This is annoying with frequent updates... || details.reason == 'update')
	{
		chrome.tabs.create({ "url": chrome.runtime.getURL('info.html') }, function() { });
	}
	// else if (details.reason == 'update')
	// {
	// 	raiseUpdateNotification();
	// }

	/*
	chrome.management.get(oldExtensionID, function(data) {
		if (data) {
			chrome.management.uninstall(oldExtensionID, { showConfirmDialog: false }, function() {
				if (chrome.extension.lastError)
				{
					console.log('error uninstalling dev site extension:');
					console.log(chrome.extension.lastError);
				}
			});
		}
	});
	*/

	reloadAllTabs();
});

function reloadAllTabs(callback) {
	for (var j = 0; j < matchingUrls.length; j++)
	{
		chrome.tabs.query({ "url": matchingUrls[j] }, function(tabs) {
			if (tabs && tabs.length > 0)
			{
				for (var i = 0; i < tabs.length; i++)
				{
					if (logVerbose) console.log('reloading matching tab ' + tabs[i].id + ' with url ' + tabs[i].url);
					chrome.tabs.reload(tabs[i].id);
				}
			}

			if (typeof callback !== 'undefined') {
				callback();
			}
		});
	}
}

// http://stackoverflow.com/a/17246127/448
chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
	// Add suggestions to an array
    var suggestions = [];
    if (text.length <= 1 || 'calendar'.substring(0, Math.min(text.length, 8)) == text.substring(0, Math.min(text.length, 8))) {
	    suggestions.push({ content: 'calendar', description: 'calendar <dim>Go directly to the calendar</dim>' });
	}
    if (text.length <= 1 || 'divpermissions'.substring(0, Math.min(text.length, 14)) == text.substring(0, Math.min(text.length, 14))) {
    	suggestions.push({ content: 'divpermissions', description: 'divpermissions <dim>Manage Download Item Version Permissions by typing "divpermissions"</dim>'});
	}
    if (text.length <= 1 || 'divsearch'.substring(0, Math.min(text.length, 9)) == text.substring(0, Math.min(text.length, 9))) {
    	suggestions.push({ content: 'divsearch', description: 'divsearch <dim>Manage Download Item Versions by typing "divsearch"</dim>'});
	}
    if (text.length <= 1 || 'dsr'.substring(0, Math.min(text.length, 3)) == text.substring(0, Math.min(text.length, 3))) {
    	suggestions.push({ content: 'dsr', description: 'dsr <dim>Go directly to Daily Status or open by typing "dsr"</dim>'});
	}
    if (text.length <= 1 || 'issue'.substring(0, Math.min(text.length, 5)) == text.substring(0, Math.min(text.length, 5))) {
	    suggestions.push({ content: 'issue', description: 'issue <dim>Edit an issue by typing "issue 123456" or go to issues with "issue"</dim>'});
	}
    if (text.length <= 1 || 'locations'.substring(0, Math.min(text.length, 9)) == text.substring(0, Math.min(text.length, 9))) {
	    suggestions.push({ content: 'locations', description: 'locations <dim>Go to Location Search an issue by typing "locations" [location name|LocationID]</dim>'});
	}
    if (text.length <= 1 || 'queryissues'.substring(0, Math.min(text.length, 11)) == text.substring(0, Math.min(text.length, 11))) {
    	suggestions.push({ content: 'queryissues', description: 'queryissues <dim>Go to Issue Search</dim>'});
	}
    if (text.length <= 1 || 'servers'.substring(0, Math.min(text.length, 7)) == text.substring(0, Math.min(text.length, 7))) {
    	suggestions.push({ content: 'servers', description: 'servers <dim>Go directly to Server Search by typing "servers" [location name]</dim>'});
	}
    if (text.length <= 1 || 'help'.substring(0, Math.min(text.length, 4)) == text.substring(0, Math.min(text.length, 4)) ||
    	suggestions.length === 0) {
	    suggestions.push({ content: 'help', description: 'Help! <dim>What can I type here?</dim>' });
	}

    // Set help suggestion as the default suggestion
    chrome.omnibox.setDefaultSuggestion({description:suggestions[suggestions.length-1].description});

    // Remove the first suggestion from the array since we just suggested it
    suggestions.shift();

    suggest(suggestions);
});

var searchTerms = [
	"calendar",
	"dsr",
	"issues",
	"divpermissions",
	"divsearch",
	"servers",
	"help",
	"locations",
	"queryissues"
];

chrome.omnibox.onInputEntered.addListener(function (text, disposition) {
	for (var i = 0; i < searchTerms.length; i++) {
		if (searchTerms[i].length >= text.trim().length &&
			searchTerms[i].substring(0, text.trim().length) == text.trim().toLowerCase()) {
			var otherMatch = false;
			for (var j = 0; j < searchTerms.length; j++) {
				if (j !== i && searchTerms[j].length >= text.trim().length &&
					searchTerms[j].substring(0, text.trim().length) == text.trim().toLowerCase()) {
					otherMatch = true;
					if (logVerbose) console.log(text + ' was ambiguous. matched "' + searchTerms[i] + '" and "' + searchTerms[j] + '"');
				}
			}
			if (!otherMatch) {
				if (logVerbose) console.log('replacing search "' + text + '" with "' + searchTerms[i] + '"');
				text = searchTerms[i];
			}
			break;
		}
	}

	if (logVerbose) console.log('searching for: ' + text);

	if (/^dsr/i.test(text)) {
		navigateOmniTab('/SupportCenter/DailyStatusListForPerson.aspx', 'http', disposition, "*/DailyStatusListForPerson.aspx");
	}
	else if (/^divpermissions/i.test(text)) {
		navigateOmniTab('/Updater/DownloadItemVersionPermissionManage.aspx', 'http', disposition, "*/DownloadItemVersionPermissionManage.aspx");
	}
	else if (/^divsearch/i.test(text)) {
		navigateOmniTab('/Updater/DownloadItemVersionSearch.aspx', 'http', disposition, "*/DownloadItemVersionSearch.aspx");
	}
	else if (/^calendar/i.test(text)) {
		navigateOmniTab('/SupportCenter/ScheduleView.aspx', 'https', disposition, "*/ScheduleView.aspx");
	}
	else if (/^s(e|er|erv|erve|erver|ervers)? (.+)/i.test(text)) {
		var match = /^s(e|er|erv|erve|erver|ervers)? (.+)/i.exec(text);
		console.logv(match);
		var miniVoldemort = 'P' + voldemort.substring(1, 7);
		navigateOmniTab('/SupportCenter/' + miniVoldemort + 'ServerSearch.aspx#SearchText=' + match[2], 'https', disposition, "*/" + miniVoldemort + 'ServerSearch.aspx', true);
	}
	else if (/^s(e|er|erv|erve|erver|ervers)?/i.test(text)) {
		var miniVoldemort = 'P' + voldemort.substring(1, 7);
		navigateOmniTab('/SupportCenter/' + miniVoldemort + 'ServerSearch.aspx', 'https', disposition, "*/" + miniVoldemort + 'ServerSearch.aspx');
	}
	else if (/^i(s|ss|ssu|ssue|ssues)? ([0-9]+)/i.test(text)) {
		var match = /^i(s|ss|ssu|ssue|ssues)? ([0-9]+)/i.exec(text);
		console.logv(match);
		var issueNumber = match[2];
		navigateOmniTab('/SupportCenter/IssueEdit.aspx?IssueNumber=' + issueNumber, 'https', disposition, "*/IssueEdit.aspx?IssueNumber=" + issueNumber);
	}
	else if (/^issues/i.test(text)) {
		navigateOmniTab('/SupportCenter/IssueMyListAdvanced.aspx', 'https', disposition, "*/IssueMyListAdvanced.aspx");
	}
	else if (/^l(|o|oc|oca|ocat|ocati|ocatio|ocation|ocations)? ([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i.test(text)) {
		var match = /^l(|o|oc|oca|ocat|ocati|ocatio|ocation|ocations)? ([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i.exec(text);
		console.logv(match);
		navigateOmniTab('/LocationEdit.aspx?LocationID=' + match[2], 'https', disposition, "LocationEdit.aspx?LocationID=" + match[2]);
	}
	else if (/^l(|o|oc|oca|ocat|ocati|ocatio|ocation|ocations)? (.+)/i.test(text)) {
		var match = /^l(|o|oc|oca|ocat|ocati|ocatio|ocation|ocations)? (.+)/i.exec(text);
		console.logv(match);
		navigateOmniTab('/LocationSearch.aspx#SearchText=' + match[2], 'https', disposition, "LocationSearch.aspx", true);
	}
	else if (/^locations/i.test(text)) {
		navigateOmniTab('/LocationSearch.aspx', 'https', disposition, "LocationSearch.aspx");
	}
	else if (/^queryissues/i.test(text)) {
		navigateOmniTab('/SupportCenter/IssueSearchAdvanced.aspx', 'https', disposition, "*/IssueSearchAdvanced.aspx");
	}
	else {
		navigateOmniTab(chrome.runtime.getURL('omniboxhelp.html'), null, disposition);
	}
});

function navigateOmniTab(url, proto, disposition, existingTabPattern, reNavigate) {
	var chromePrefix = 'chrome-extension://';

	if (url.length < chromePrefix.length || url.substring(0, chromePrefix.length) !== chromePrefix) {
		proto = proto ? proto : 'http';
		url = proto + '://www.' + voldemort + '.com' + url;
	}

	if (existingTabPattern) {
		existingTabPattern = "*://*." + voldemort + ".com/" + existingTabPattern;

		chrome.tabs.query({ url: existingTabPattern }, function (tabResults) {
			if (tabResults && tabResults.length > 0) {
				focusTab(tabResults[0], reNavigate ? url : undefined);
			}
			else {
				openOmniTab(url, disposition);
			}
		});
	} else {
		openOmniTab(url, disposition);
	}
}

function openOmniTab(url, disposition) {
	if (disposition === "currentTab") {
		chrome.tabs.update(undefined, { url: url, active: true }, function() {});
	}
	else {
		var isActive = disposition == "newForegroundTab";
		chrome.tabs.create({ url: url, active: isActive }, function() {});
	}
}

function checkHasSupportRequests(source) {
    var sevenDays = 7 * 24 * 60 * 60 * 1000;
	getSettings(function(settings) {
		if (settings.enabled
			&& settings.checkSupportRequests
			&& typeof settings.lastAllowedTime === 'number'
            && Date.now() - settings.lastAllowedTime < sevenDays
            && typeof settings.lastAllowedUsername === 'string') {
			chrome.cookies.get({ "url": 'https://www.' + voldemort + '.com', "name": "LogonName" }, function(cookie) {
				console.logv('Received LogonName cookie response:');
				console.logv(cookie);
				if (cookie
					&& typeof cookie.value === 'string'
					&& settings.lastAllowedUsername.toLowerCase() == cookie.value.toLowerCase()) {

					$.get('https://www.' + voldemort + '.com/SupportCenter/PersonIssueSupportRequests.aspx', function (data) {
						var supportTable = $(data).find('.PersonIssueSupport tr');
						var hasRequests = (supportTable !== undefined && supportTable.length > 1);

						console.logv('Has support requests: ' + hasRequests + '. source: ' + source);

						if (hasRequests) {
							if (source == 'alarm') {
								if (settings.notifySupportRequest) {
									raiseSupportRequestNotification(settings);
								}
							}
							else if (source == 'pageMessage') {
								var count = supportTable.length - 1;
								sendOneWayMessageToContentScript({"eventName": "supportRequestsFound", "count": count});
							}
						}
					});
				}
			});
		}
	});
}

function doStartupItems() {
	chrome.alarms.clear('ntdsrmods_checksupportrequests', function() {
		console.logv('Cleared alarm ntdsrmods_checksupportrequests. Recreating...');
		chrome.alarms.create('ntdsrmods_checksupportrequests', { 'when': Date.now() + 5000, 'periodInMinutes': 60 });
	});
	chrome.alarms.clear('ntdsrmods_heartbeat', function() {
		console.logv('Cleared alarm ntdsrmods_heartbeat. Recreating...');
		chrome.alarms.create('ntdsrmods_heartbeat', { 'when': Date.now() + 5000, 'periodInMinutes': 60 });
	});
}

chrome.runtime.onStartup.addListener(doStartupItems);
chrome.runtime.onInstalled.addListener(doStartupItems);

chrome.commands.onCommand.addListener(function(command) {
	console.logv('Command: ' + command);
	
	if (command == 'toggle-enabled') {
		getSettings(function(curSettings) {
			console.logv('Toggling "enabled". Previous value: ' + curSettings.enabled + '. New value: ' + !curSettings.enabled);
			
			if (curSettings.enabled) {
				chrome.notifications.getAll(function(currentNotifications) {
					for (var key in currentNotifications) {
						console.logv('Clearing notification: ' + key);
						chrome.notifications.clear(key, function() {});						
					}
				});
			}

			curSettings.enabled = !curSettings.enabled;
			saveSettings(curSettings, function() { reloadAllTabs(); });
		});
	}
});

(function() {
	var popupSettings1 = { primaryPattern: "*://*." + voldemort + ".com/*", setting: 'allow' };
	var popupSettings2 = { primaryPattern: "http://localhost/*", setting: 'allow' };
	chrome.contentSettings.popups.set(popupSettings1);
	if (logVerbose) console.log('set popup settings to: ' + JSON.stringify(popupSettings1));

	if (matchingUrls.length > 1) {
		chrome.contentSettings.popups.set(popupSettings2);
		if (logVerbose) console.log('set popup settings to: ' + JSON.stringify(popupSettings2));
	}
})();