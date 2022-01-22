console.logv('content script loaded');
jQuery.fn.exists = function(){ return this.length>0; };

var rot13functions = document.createElement("script");
rot13functions.src = chrome.runtime.getURL("assets/js/rot13x.js");
(document.head||document.documentElement).appendChild(rot13functions);

var contentscopefunctions = document.createElement("script");
contentscopefunctions.src = chrome.runtime.getURL("assets/js/content-scope-functions.js");
(document.head||document.documentElement).appendChild(contentscopefunctions);

$(function ()
{
    var sevenDays = 7 * 24 * 60 * 60 * 1000;
    var dsr = new DsrManager(document);
    var misc = new MiscManager(document, window.location.href);
    var currentSettings;

    if (dsr.isValidDailyStatusPage() || misc.isValidPage()) {
        chrome.runtime.sendMessage({ "eventName": "getSettings" }, function(settings) {
            currentSettings = settings;

            chrome.runtime.sendMessage({ "eventName": "needsLogonName" }, function(logonName) {
                if (logonName) {
                    if (settings.enabled && dsr.isValidDailyStatusPage())
                    {
                        dsr.addWarningFiredListener(warningFiredEventHandler);

                        chrome.runtime.sendMessage({ "eventName": "pageLoaded", "logonName": logonName, "settings": settings });
                    }

                    if (settings.enabled
                        && typeof settings.lastAllowedTime === 'number'
                        && Date.now() - settings.lastAllowedTime < sevenDays
                        && typeof settings.lastAllowedUsername === 'string'
                        && settings.lastAllowedUsername.toLowerCase() == logonName.toLowerCase()) {

                        var request = { eventName: "settingsUpdated", settings: settings };
                        if (logVerbose) console.log('sending message to window:' + JSON.stringify(request) + ', ' + window.location.href);

                        window.postMessage(request, window.location.href);

                        if (dsr.isValidDailyStatusPage()) {
                            dsr.refresh(settings);
                        }

                        if (misc.isValidPage()) {
                            misc.refresh(settings);
                        }
                    }
                }
            });
        });
    }

    function warningFiredEventHandler(message)
    {
        chrome.runtime.sendMessage({
            "notificationID": "timewarning",
            "eventName": "raiseNotification",
            "title": "Time to Clock Out",
            "message": message,
            "settings": currentSettings
        });
    }

    function onMessage(request, sender, responseCallback)
    {
        console.logv('received request');
        console.logv(request);

        if (request && request.eventName)
        {
            if (request.eventName == "uiException")
            {
                var err = request.errorText;
                alert('Something bad happened. You should probably reload.\n\n' + err);
            }
            else if (request.eventName == "settingsUpdated")
            {
                currentSettings = request.settings;
                // send to content-scope-functions
                if (logVerbose) console.log('sending message to window:' + JSON.stringify(request) + ', ' + window.location.href);
                window.postMessage(request, window.location.href);

                if (dsr.isValidDailyStatusPage()) {
                    dsr.refresh(request.settings);
                }

                if (misc.isValidPage()) {
                    misc.refresh(request.settings);
                }
            }
            else if (request.eventName == "newVersionNotification")
            {
                var programInfo = request.info;
                displayNewProgramInfo(programInfo);
            }
            else if (request.eventName == "ackNewVersion")
            {
                console.logv('received ackNewVersion');
                $('.ntdsrmods-alert').effect("puff", {});
            }
            else if (request.eventName == "supportRequestsFound")
            {
                console.logv('received supportRequestsFound');
                misc.updateSupportRequests(request.count);
            }
        }
    }

    chrome.runtime.onMessage.addListener(onMessage);

    function displayNewProgramInfo(programInfo) {
        var alert = $(document.createElement('div')).addClass('ntdsrmods-alert');
        var heading = $(document.createElement('div'))
            .addClass('ntdsrmods-alert-heading')
            .html(programInfo.heading);
        var message = $(document.createElement('div'))
            .addClass('ntdsrmods-alert-message')
            .html(programInfo.message);
        var links = $(document.createElement('div'))
            .addClass('ntdsrmods-alert-message-links');
        var info = $(document.createElement('a'))
            .addClass('ntdsrmods-alert-link ntdsrmods-alert-link-info')
            .attr('href', '#')
            .text('More Info')
            .click(function(evt) {
                evt.preventDefault();
                chrome.runtime.sendMessage({ eventName: "openTab", url: chrome.runtime.getURL("info.html") });
            });
        var close = $(document.createElement('a'))
            .addClass('ntdsrmods-alert-link ntdsrmods-alert-link-close')
            .attr('href', '#')
            .text('Close')
            .click(function(evt) {
                evt.preventDefault();
                chrome.runtime.sendMessage({ eventName: "ackNewVersion" });
            });
        links.append(info, close);
        alert.append(heading, message, links);

        $('#ctl00_ContentPlaceHolder2_dgResults').after(alert);
    }
});