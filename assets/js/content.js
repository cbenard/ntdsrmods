jQuery.fn.exists = function(){ return this.length>0; };

$(function ()
{
    var currentSettings;
    var LogonName = $.cookie('LogonName');
    var pnlTime;
    var totalElement;
    var totalEstimatedElement;
    var createdOnElement;
    var panelElement;
    var timeTable;
    var scriptStartDate;
    var totalEstimated;
    var clockedIn;
    var ourElement;
    var hoursNeededElement;
    var endOfDayElement;
    var overtimeElement;
    var timeYouCanLeaveElement;
    var paused = false;
    var timer;
    var timeToLeave;
    var todayEnd;
    var hasFiredWarning = false;

    if ($('div[id$="pnlTime"] table[id$="dgResults"]').length)
    {
        chrome.runtime.sendMessage({ "eventName": "pageLoaded", "logonName": LogonName });

        chrome.runtime.sendMessage({ "eventName": "getSettings" }, handleSettingsReceived);
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
                hasFiredWarning = false;
                currentSettings = request.settings;
                todayEnd = undefined;
                timeToLeave = undefined;
            }
        }
    }

    chrome.runtime.onMessage.addListener(onMessage);

    function handleSettingsReceived(settings)
    {
        currentSettings = settings;

        doStartup();
    }

    function doStartup()
    {
        console.log('Doing startup with these settings:');
        console.log(currentSettings);

        findElements();
        addOurElements();
        setupTimer();
    }

    function findElements()
    {
        pnlTime = $('div[id$="pnlTime"]');
        totalElement = pnlTime.find('[id$="lblTotal"]');
        totalEstimatedElement = pnlTime.find('[id$="lblTotalEstimated"]');
        createdOnElement = pnlTime.find('[id$="lblTime"]');
        panelElement = pnlTime.find('div[id$="divResults"]');
        timeTable = pnlTime.find('table[id$="dgResults"]');
        scriptStartDate = new Date();

        if (totalEstimatedElement.exists())
        {
            totalEstimated = parseFloat(totalEstimatedElement.text());
        }
        else if (totalElement.exists())
        {
            totalEstimated = parseFloat(totalElement.text());
        }

        if (isNaN(totalEstimated))
        {
            totalEstimated = 0;
        }
        console.log('estimated now ' + totalEstimated);

        clockedIn = totalEstimatedElement && totalEstimatedElement.length > 0;
    }

    function addOurElements()
    {
        if (!$('#ntdsrmods-container').exists())
        {
            ourElement = $('<div id="ntdsrmods-container" class="ntdsrmods-hidden"></div>');
            ourElement.insertBefore(timeTable);
            if (!totalEstimatedElement.exists())
            {
                divEstimatedTotalElement = $('<div id="ntdsrmods-divEstimatedTotal" class="ntdsrmods-hidden"><strong>Estimated Total As Of Now:</strong> <span id="ntdsrmods-lblTotalEstimated">0.00</span></div>');
                ourElement.append(divEstimatedTotalElement);
                totalEstimatedElement = $('#ntdsrmods-lblTotalEstimated');
            }
            hoursNeededElement = $('<div id="ntdsrmods-hoursneeded" class="ntdsrmods-hidden"><strong>Hours needed to get <span id="ntdsrmods-hoursneeded-hourgoal"></span> hours:</strong> <span id="ntdsrmods-hoursneeded-decimalhours"></span> (<span id="ntdsrmods-hoursneeded-friendlyhours"></span>)</div>');
            ourElement.append(hoursNeededElement);
            endOfDayElement = $('<div id="ntdsrmods-estimatedatend" class="ntdsrmods-hidden"><strong>Estimated time at <span id="ntdsrmods-estimatedatend-endtime"></span>:</strong> <span id="ntdsrmods-estimatedatend-decimalhours"></span> (<span id="ntdsrmods-estimatedatend-friendlyhours"></span>)</div>');
            ourElement.append(endOfDayElement);
            timeYouCanLeaveElement = $('<div id="ntdsrmods-timeyoucanleave" class="ntdsrmods-hidden"><strong>Time you can leave:</strong> <span id="ntdsrmods-timeyoucanleave-time"></span></div>');
            ourElement.append(timeYouCanLeaveElement);
            overtimeElement = $('<div id="ntdsrmods-overtime" class="ntdsrmods-hidden"><strong>Overtime:</strong> <span id="ntdsrmods-overtime-decimalhours"></span> (<span id="ntdsrmods-overtime-friendlyhours"></span>)</div>');
            ourElement.append(overtimeElement);
        }
        if (!$('#ntdsrmods-fontawesome').exists())
        {
            $('head').append('<link id="ntdsrmods-fontawesome" rel="stylesheet" type="text/css" href="http://netdna.bootstrapcdn.com/font-awesome/3.2.0/css/font-awesome.min.css" />');
        }
        // if (!$('#ntdsrmods-actions').exists())
        // {
        //     $('<div id="ntdsrmods-actions" class="ntdsrmods-hidden"><i id="ntdsrmods-play-pause" title="Play/Pause" class="icon-pause"></i></div>').insertBefore(pnlTime.first());
        //     $('#ntdsrmods-play-pause').click(function() { playPause($(this)) });
        // }

        timeToLeave = undefined;
        todayEnd = undefined;
    }

    function setupTimer()
    {
        if (timer)
        {
            window.clearInterval(timer);
        }

        timer = window.setInterval(timerFired, 1000);
        timerFired();
    }

    function getCurrentEstimatedHours()
    {
        // Convert to hours
        var differenceSeconds = (new Date() - scriptStartDate) / 1000 / 60 / 60;
        differenceSeconds += totalEstimated;
        return differenceSeconds;
    }

    function formatHours(number)
    {
        var hours = parseInt(number);
        var partialHour = number - parseInt(number);
        var minutesDecimal = 60 * partialHour;
        var minutes = parseInt(minutesDecimal);
        var seconds = round((minutesDecimal - parseInt(minutesDecimal)) * 60, 0);
        
        var returnString = '';
        if (hours > 0)
        {
            returnString += hours + 'h ';
        }
        if (minutes > 0)
        {
            returnString += minutes + 'm ';
        }
        if (seconds > 0)
        {
            returnString += seconds + 's';
        }
        return returnString.trim();
    }

    function playPause(jqPlayPause)
    {
        if (jqPlayPause.hasClass('icon-pause'))
        {
            // We are going, so stop
            jqPlayPause.removeClass('icon-pause').addClass('icon-play');
            paused = true;
        }
        else
        {
            // We are stopped so go
            jqPlayPause.removeClass('icon-play').addClass('icon-pause');
            paused = false;
        }
    }

    function round(number, places)
    {
        //return Math.round(number * Math.pow(10, places)) / Math.pow(10, places);
        return number.toFixed(places);
    }

    function getTimeToLeave()
    {
        if (timeToLeave == undefined)
        {
            var hours = currentSettings.hoursPerWeek - getCurrentEstimatedHours();
            var hour = parseInt(hours);
            hours -= hour;
            var minutes = parseInt((hours * 60) + 0.6);

            timeToLeave = new Date();
            timeToLeave.setHours(timeToLeave.getHours() + hour);
            timeToLeave.setMinutes(timeToLeave.getMinutes() + minutes);

            timeToLeave.setSeconds(0);
        }
        
        return timeToLeave;
    }

    function getTodayEndDate()
    {
        if (todayEnd == undefined)
        {
            todayEnd = new Date();
            todayEnd.setHours(currentSettings.endOfDayTimeHour);
            todayEnd.setMinutes(currentSettings.endOfDayTimeMinute);
        }

        return todayEnd;
    }

    function fireWarning()
    {
        var message = "It's almost time to clock out!";
        if (currentSettings.minuteWarning == 0)
        {
            message = "It's time to clock out!";
        }

        chrome.runtime.sendMessage({
            "eventName": "raiseNotification",
            "title": "Time to Clock Out",
            "message": message
        }, function () {
            hasFiredWarning = true;
        });
    }

    function timerFired()
    {
        var now = new Date();

        if (!$('#ntdsrmods-container').exists())
        {
            findElements();
            addOurElements();
        }

        if (!clockedIn)
        {
            scriptStartDate = now;
        }

        if (!paused)
        {
            if ($('#ntdsrmods-container').hasClass('ntdsrmods-hidden'))
            {
                $('#ntdsrmods-container').removeClass('ntdsrmods-hidden');
            }

            if (clockedIn)
            {
                totalEstimatedElement.text(round(getCurrentEstimatedHours(), 2) + " (" + formatHours(getCurrentEstimatedHours()) + ")");

                if (currentSettings.notifyMe && !hasFiredWarning)
                {
                    var warningTime = new Date(getTimeToLeave() - (currentSettings.minuteWarning * 60000));
                    if (warningTime <= now)
                    {
                        console.log('firing warning');
                        fireWarning();
                    }
                }
            }

            var hoursNeeded = round(currentSettings.hoursPerWeek - getCurrentEstimatedHours(), 4);

            if (hoursNeeded >= 0)
            {
                $('#ntdsrmods-overtime').addClass('ntdsrmods-hidden');
                $('#ntdsrmods-hoursneeded').removeClass('ntdsrmods-hidden');

                $('#ntdsrmods-hoursneeded-hourgoal').text(currentSettings.hoursPerWeek);
                $('#ntdsrmods-hoursneeded-decimalhours').text(hoursNeeded);
                $('#ntdsrmods-hoursneeded-friendlyhours').text(formatHours(hoursNeeded));

                if (getTimeToLeave() < getTodayEndDate())
                {
                    $('#ntdsrmods-timeyoucanleave').removeClass('ntdsrmods-hidden');
                    $('#ntdsrmods-timeyoucanleave-time').text(formatDate(getTimeToLeave(), "h:mm a"));
                }
                else
                {
                    $('#ntdsrmods-timeyoucanleave').addClass('ntdsrmods-hidden');
                }
            }
            else
            {
                $('#ntdsrmods-hoursneeded').addClass('ntdsrmods-hidden');
                $('#ntdsrmods-overtime').removeClass('ntdsrmods-hidden');

                $('#ntdsrmods-overtime-decimalhours').text((hoursNeeded * -1));
                $('#ntdsrmods-overtime-friendlyhours').text(formatHours(hoursNeeded * -1));
            }

            if (clockedIn && now < getTodayEndDate())
            {
                var difference = getTodayEndDate().getTime() - now.getTime();
                // Convert to hours
                difference = difference / 1000 / 60 / 60;
                var differenceHours = round(difference + totalEstimated, 2);
                var differenceFriendlyHours = formatHours(differenceHours);

                $('#ntdsrmods-estimatedatend').removeClass('ntdsrmods-hidden');
                $('#ntdsrmods-estimatedatend-endtime').text(formatDate(getTodayEndDate(), "h:mm a"));
                $('#ntdsrmods-estimatedatend-decimalhours').text(differenceHours);
                $('#ntdsrmods-estimatedatend-friendlyhours').text(differenceFriendlyHours);
            }
            else
            {
                $('#ntdsrmods-estimatedatend').addClass('ntdsrmods-hidden');
            }
        }
    }
});