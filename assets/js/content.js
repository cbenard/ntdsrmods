jQuery.fn.exists = function(){ return this.length>0; };

$(function ()
{
    var dsr = new DsrManager(document);
    var currentSettings;

    if (dsr.isValidDailyStatusPage())
    {
        dsr.addWarningFiredListener(warningFiredEventHandler);

        chrome.runtime.sendMessage({ "eventName": "pageLoaded", "logonName": $.cookie('LogonName') });

        chrome.runtime.sendMessage({ "eventName": "getSettings" }, function(settings) { currentSettings = settings; dsr.refresh(settings); });
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
        console.log('received request');
        console.log(request);

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
                dsr.refresh(request.settings);
            }
            else if (request.eventName == "newVersionNotification")
            {
                var programInfo = request.info;
                displayNewProgramInfo(programInfo);
            }
            else if (request.eventName == "ackNewVersion")
            {
                console.log('received ackNewVersion');
                $('.ntdsrmods-alert').effect("puff", {});
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
            .text('More Info');
        var close = $(document.createElement('a'))
            .addClass('ntdsrmods-alert-link ntdsrmods-alert-link-close')
            .attr('href', '#')
            .text('Close');
        links.append(info, close);
        alert.append(heading, message, links);

        $('#ctl00_ContentPlaceHolder2_dgResults').after(alert);
    }

    $(document).on('click', '.ntdsrmods-alert-link-close', function(evt) {
        evt.preventDefault();
        chrome.runtime.sendMessage({ eventName: "ackNewVersion" });
    });
    $(document).on('click', '.ntdsrmods-alert-link-info', function(evt) {
        evt.preventDefault();
        chrome.runtime.sendMessage({ eventName: "openTab", url: chrome.runtime.getURL("info.html") });
    });
});