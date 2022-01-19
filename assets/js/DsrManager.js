function DsrManager(inputContext)
{
    var currentSettings;
    var pnlTime;
    var totalLabel;
    var totalElement;
    var totalEstimatedElement;
    var createdOnElement;
    var panelElement;
    var timeTable;
    var scriptStartDate;
    var totalEstimated;
    var clockedIn;
    var ourElement;
    var supportRequestsElement;
    var hoursNeededElement;
    var endOfDayElement;
    var overtimeElement;
    var timeYouCanLeaveElement;
    var paused = false;
    var timer;
    var timeToLeave;
    var todayStart;
    var todayEnd;
    var dayDuration;
    var hasFiredWarning = false;
    var warningFiredCallbacks = [];
    var context = inputContext;
    var collapseTimerID = null;

    function handleSettingsReceived(settings)
    {
        var shouldDoStartup = currentSettings == undefined;

        currentSettings = settings;

        if (shouldDoStartup)
        {
            doGuardedStartup();
        }
        else
        {
            hasFiredWarning = false;
            todayStart = undefined;
            todayEnd = undefined;
            dayDuration = undefined;
            timeToLeave = undefined;
        }

        if (typeof settings !== 'undefined'
            && typeof outerElement !== 'undefined'
            && typeof totalLabel !== 'undefined'
            && typeof settings.distractionFreeMode === 'boolean') {
            if (settings.distractionFreeMode) {
                $(outerElement).hide();
            }
            else {
                $(outerElement).show();
            }
            $(totalLabel).css('cursor', $(outerElement).is(":visible") ? "zoom-out" : "zoom-in");
        }
    }

    function doGuardedStartup()
    {
        if (hasLoadedTotal())
        {
            doStartup();
        }
        else
        {
            console.logv('Didn\'t find DSR total. Waiting 500ms');
            setTimeout(doGuardedStartup, 500);
        }
    }

    function doStartup()
    {
        console.logv('DsrManager doing startup with these settings:');
        console.logv(currentSettings);

        findElements();
        addOurElements();
        setupTimer();
    }

    function hasLoadedTotal()
    {
        try
        {
            var tempPnlTime = $('div[id$="pnlTime"]', context);
            var tempTotalElement = tempPnlTime.find('[id$="lblTotal"]');
            console.logv(`tempTotalElement length: ${tempTotalElement.text().length}, text: ${tempTotalElement.text()}`);
            return tempTotalElement.text().length > 0;
        }
        catch
        {
            return false;
        }
    }

    function findElements()
    {
        pnlTime = $('div[id$="pnlTime"]', context);
        totalLabel = pnlTime.find("strong:contains('Total: ')");
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

        if (logVerbose) console.log('estimated now ' + totalEstimated);

        clockedIn = timeTable.find('tr').last().find('td').eq(1).text().trim() == "";
    }

    function addOurElements()
    {
        if (!$('#supportrequest-container', context).exists())
        {
            supportRequestsElement = $('<div id="supportrequest-container" style="padding: 10px 10px 5px 10px" class="ntdsrmods-hidden">You have <a href="/SupportCenter/PersonIssueSupportRequests.aspx"><span id="supportrequest-count">0</span> unhandled support request<span id="supportrequest-plural" style="display: none">s</span></a>.</div>');
            supportRequestsElement.insertBefore(panelElement);
        }

        if (!$('#ntdsrmods-container', context).exists())
        {
            outerElement = $('<div id="outer-ntdsrmods-container"></div>');
            if (currentSettings.distractionFreeMode) {
                outerElement.hide();
                $(totalLabel).css('cursor', 'zoom-in');
            }
            else {
                $(totalLabel).css('cursor', 'zoom-out');
            }
            ourElement = $('<div id="ntdsrmods-container" class="ntdsrmods-hidden"></div>');
            outerElement.append(ourElement);
            outerElement.insertBefore(timeTable);
            if (clockedIn && !totalEstimatedElement.exists())
            {
                divEstimatedTotalElement = $('<div id="ntdsrmods-divEstimatedTotal"><strong>Estimated Total As Of Now:</strong> <span id="ntdsrmods-lblTotalEstimated">0.00</span></div>');
                ourElement.append(divEstimatedTotalElement);
                totalEstimatedElement = $('#ntdsrmods-lblTotalEstimated', context);
            }
            hoursNeededElement = $('<div id="ntdsrmods-hoursneeded" class="ntdsrmods-hidden"><strong>Hours needed to get <span id="ntdsrmods-hoursneeded-hourgoal"></span> hours:</strong> <span id="ntdsrmods-hoursneeded-decimalhours"></span> (<span id="ntdsrmods-hoursneeded-friendlyhours"></span>)</div>');
            ourElement.append(hoursNeededElement);
            endOfDayElement = $('<div id="ntdsrmods-estimatedatend" class="ntdsrmods-hidden"><strong>Estimated time at <span id="ntdsrmods-estimatedatend-endtime"></span>:</strong> <span id="ntdsrmods-estimatedatend-decimalhours"></span> (<span id="ntdsrmods-estimatedatend-friendlyhours"></span>)</div>');
            ourElement.append(endOfDayElement);
            timeYouCanLeaveElement = $('<div id="ntdsrmods-timeyoucanleave" class="ntdsrmods-hidden"><strong>Time you can leave<span id="ntdsrmods-timeyoucanleave-tomorrow"></span>:</strong> <span id="ntdsrmods-timeyoucanleave-time"></span></div>');
            ourElement.append(timeYouCanLeaveElement);
            overtimeElement = $('<div id="ntdsrmods-overtime" class="ntdsrmods-hidden"><strong>Overtime:</strong> <span id="ntdsrmods-overtime-decimalhours"></span> (<span id="ntdsrmods-overtime-friendlyhours"></span>)</div>');
            ourElement.append(overtimeElement);
        }
        if (!$('#ntdsrmods-fontawesome', context).exists())
        {
            $('head', context).append('<link id="ntdsrmods-fontawesome" rel="stylesheet" type="text/css" href="https://netdna.bootstrapcdn.com/font-awesome/3.2.0/css/font-awesome.min.css" />');
        }
        // if (!$('#ntdsrmods-actions').exists())
        // {
        //     $('<div id="ntdsrmods-actions" class="ntdsrmods-hidden"><i id="ntdsrmods-play-pause" title="Play/Pause" class="icon-pause"></i></div>').insertBefore(pnlTime.first());
        //     $('#ntdsrmods-play-pause').click(function() { playPause($(this)) });
        // }

        timeToLeave = undefined;
        todayEnd = undefined;

        $(totalLabel).click(function(evt) {
            evt.preventDefault();
            console.logv('Toggling DSR info.');
            $(outerElement).toggle();
            $(totalLabel).css('cursor', $(outerElement).is(":visible") ? "zoom-out" : "zoom-in");

            if (currentSettings
                && currentSettings.distractionFreeMode
                && $(outerElement).is(":visible")) {
                if (collapseTimerID) {
                    console.logv('Clearing existing collapse timer: ' + collapseTimerID);
                    clearTimeout(collapseTimerID);
                }
                collapseTimerID = setTimeout(function() {
                    $(outerElement).hide();
                    $(totalLabel).css('cursor', $(outerElement).is(":visible") ? "zoom-out" : "zoom-in");
                }, 30000);
                console.logv('Set collapse timer: ' + collapseTimerID);
            }
        });
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
        var hours = parseInt(number, 10);
        var partialHour = number - parseInt(number, 10);
        var minutesDecimal = 60 * partialHour;
        var minutes = parseInt(minutesDecimal, 10);
        var seconds = round((minutesDecimal - parseInt(minutesDecimal, 10)) * 60, 0);
        
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
            var hour = parseInt(hours, 10);
            hours -= hour; // Take whole hours out of the time to get the minutes
            var minutes = parseInt((hours * 60) + 0.6, 10); // 0.6 to round up

            timeToLeave = new Date();
            timeToLeave.setHours(timeToLeave.getHours() + hour, timeToLeave.getMinutes() + minutes, 0, 0);
        }
        
        return new Date(timeToLeave);
    }

    function getTodayStartDate()
    {
        if (todayStart == undefined)
        {
            todayStart = new Date();
            todayStart.setHours(currentSettings.beginningOfDayTimeHour, currentSettings.beginningOfDayTimeMinute, 0, 0);
        }

        return new Date(todayStart);
    }

    function getTodayEndDate()
    {
        if (todayEnd == undefined)
        {
            todayEnd = new Date();
            todayEnd.setHours(currentSettings.endOfDayTimeHour, currentSettings.endOfDayTimeMinute, 0, 0);
        }

        return new Date(todayEnd);
    }

    function getWorkDayDuration()
    {
        if (dayDuration == undefined)
        {
            dayDuration = getTodayEndDate() - getTodayStartDate();
        }

        return parseInt(dayDuration, 10);
    }

    function fireWarning()
    {
        var message = "It's almost time to clock out!";
        if (currentSettings.minuteWarning == 0)
        {
            message = "It's time to clock out!";
        }

        for (var i = 0; i < warningFiredCallbacks.length; i++)
        {
            try
            {
                warningFiredCallbacks[i](message);
            }
            catch (ex)
            {
                console.log('Error calling warningFiredCallback: ' + ex);
            }
        };
    }

    function hasSelectedDsrText() {
        var sel = context.getSelection();

        var shouldPause = sel &&
            sel.type &&
            sel.type == "Range" &&
            sel.baseNode &&
            $(sel.baseNode, context).parents('div[id$=divResults]').length > 0;

        return shouldPause;
    }

    function timerFired()
    {
        var now = new Date();

        if (!$('#ntdsrmods-container', context).exists())
        {
            findElements();
            addOurElements();
        }

        if (!clockedIn)
        {
            scriptStartDate = now;
        }

        if (!paused && !hasSelectedDsrText())
        {
            if ($('#ntdsrmods-container', context).hasClass('ntdsrmods-hidden'))
            {
                $('#ntdsrmods-container', context).removeClass('ntdsrmods-hidden');
            }

            if (clockedIn)
            {
                if ($(outerElement).is(":visible")) {
                    totalEstimatedElement.text(round(getCurrentEstimatedHours(), 2) + " (" + formatHours(getCurrentEstimatedHours()) + ")");
                }
                else if (/\(/.test(totalEstimatedElement.text())) {
                    totalEstimatedElement.text(round(getCurrentEstimatedHours(), 2));
                }

                if (currentSettings.notifyMe && !hasFiredWarning)
                {
                    var warningTime = new Date(getTimeToLeave() - (currentSettings.minuteWarning * 60000));
                    if (warningTime <= now)
                    {
                        console.logv('firing warning');
                        fireWarning();
                        hasFiredWarning = true;
                    }
                }
            }

            var hoursNeeded = round(currentSettings.hoursPerWeek - getCurrentEstimatedHours(), 4);
            var millisecondsNeeded = hoursNeeded * 60 * 60 * 1000;

            if (hoursNeeded >= 0)
            {
                $('#ntdsrmods-overtime', context).addClass('ntdsrmods-hidden');
                $('#ntdsrmods-hoursneeded', context).removeClass('ntdsrmods-hidden');

                $('#ntdsrmods-hoursneeded-hourgoal', context).text(currentSettings.hoursPerWeek);
                $('#ntdsrmods-hoursneeded-decimalhours', context).text(hoursNeeded);
                $('#ntdsrmods-hoursneeded-friendlyhours', context).text(formatHours(hoursNeeded));

                var tomorrowStart = getTodayStartDate();
                tomorrowStart += 24*60*60*1000;
                var tomorrowEnd = new Date(tomorrowStart);
                tomorrowEnd += getWorkDayDuration();
                var todayPlusOneWorkDay = getTodayEndDate();
                todayPlusOneWorkDay.setMilliseconds(todayPlusOneWorkDay.getMilliseconds() + getWorkDayDuration());

                if (getTimeToLeave() < getTodayEndDate())
                {
                    $('#ntdsrmods-timeyoucanleave', context).removeClass('ntdsrmods-hidden');
                    $('#ntdsrmods-timeyoucanleave-time', context).text(formatDate(getTimeToLeave(), "h:mm a"));
                    $('#ntdsrmods-timeyoucanleave-tomorrow', context).text('');
                }
                // Only do the wraparound if it's not Saturday (we can't wrap to Sunday)
                else if (new Date().getDay() < 6 && getTimeToLeave() < todayPlusOneWorkDay)
                {
                    var tomorrowLeave;
                    if (clockedIn) {
                        tomorrowLeave = getTodayStartDate();
                        tomorrowLeave.setMilliseconds(getTimeToLeave() - getTodayEndDate());
                    }
                    else {
                        tomorrowLeave = getTodayStartDate();
                        tomorrowLeave.setMilliseconds(tomorrowLeave.getMilliseconds() + millisecondsNeeded);
                    }

                    $('#ntdsrmods-timeyoucanleave', context).removeClass('ntdsrmods-hidden');
                    $('#ntdsrmods-timeyoucanleave-time', context).text(formatDate(tomorrowLeave, "h:mm a"));
                    $('#ntdsrmods-timeyoucanleave-tomorrow', context).text(' tomorrow');
                }
                else
                {
                    $('#ntdsrmods-timeyoucanleave-tomorrow', context).text('');
                    $('#ntdsrmods-timeyoucanleave', context).addClass('ntdsrmods-hidden');
                }
            }
            else
            {
                $('#ntdsrmods-hoursneeded', context).addClass('ntdsrmods-hidden');
                $('#ntdsrmods-overtime', context).removeClass('ntdsrmods-hidden');

                $('#ntdsrmods-overtime-decimalhours', context).text((hoursNeeded * -1));
                $('#ntdsrmods-overtime-friendlyhours', context).text(formatHours(hoursNeeded * -1));
            }

            if (clockedIn && now < getTodayEndDate())
            {
                var difference = getTodayEndDate().getTime() - now.getTime();
                // Convert to hours
                difference = difference / 1000 / 60 / 60;
                var differenceHours = round(difference + getCurrentEstimatedHours(), 2);
                var differenceFriendlyHours = formatHours(differenceHours);

                $('#ntdsrmods-estimatedatend', context).removeClass('ntdsrmods-hidden');
                $('#ntdsrmods-estimatedatend-endtime', context).text(formatDate(getTodayEndDate(), "h:mm a"));
                $('#ntdsrmods-estimatedatend-decimalhours', context).text(differenceHours);
                $('#ntdsrmods-estimatedatend-friendlyhours', context).text(differenceFriendlyHours);
            }
            else
            {
                $('#ntdsrmods-estimatedatend', context).addClass('ntdsrmods-hidden');
            }
        }
    }

    this.isValidDailyStatusPage = function()
    {
        var regexMatch = /DailyStatusListForPerson.aspx/i.test(context.location.href) ||
            /localhost.*clocked/i.test(context.location.href);

        return (regexMatch) &&
            $('div[id$="pnlTime"] table[id$="dgResults"]', context).length > 0;
    };

    this.refresh = function(settings)
    {
        handleSettingsReceived(settings);
    };

    this.addWarningFiredListener = function(callback)
    {
        warningFiredCallbacks.push(callback);
    }
}