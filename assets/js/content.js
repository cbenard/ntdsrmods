jQuery.fn.exists = function(){ return this.length>0; };

$(function ()
{
    var dsr = new DsrManager(document);

    if (dsr.isValidDailyStatusPage())
    {
        dsr.addWarningFiredListener(warningFiredEventHandler);

        chrome.runtime.sendMessage({ "eventName": "pageLoaded", "logonName": $.cookie('LogonName') });

        chrome.runtime.sendMessage({ "eventName": "getSettings" }, function(settings) { dsr.refresh(settings); });
    }

    function warningFiredEventHandler(message)
    {
        chrome.runtime.sendMessage({
            "eventName": "raiseNotification",
            "title": "Time to Clock Out",
            "message": message
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
                dsr.refresh(request.settings);
            }
        }
    }

    chrome.runtime.onMessage.addListener(onMessage);
});