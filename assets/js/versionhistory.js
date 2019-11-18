var versionHistory = {
	"0.46": {
		heading: "New Daily Status Mods",
		message: "<strong>New features:</strong> <ul><li>Sound options (defaults on).</li><li>\"Time you can leave\" " +
				 "wraps to the next day (so <strong>be sure to set the \"Beginning of Day\" " +
				 "correctly</strong>).</li><li>Monday clock-in support (finally!).</li></ul>"
	},

	"1.0": {
		heading: "Programmer Enhancement Suite Update",
		message: "<p>Welcome to the new and improved Programmer Enhancement Suite (PES).</p>" +
				 "<strong>New features:</strong> <ul>" +
				 "<li>New name: No longer just \"Daily Status Modifications\".</li>" +
				 "<li><strong>Omnibox Support!</strong> Type \"nib\" into your address bar and hit space. Hit space again to see options listed. Type \"nib help\" to get started or click \"More Info\" below.</li>" +
				 "<li>Other dev site mods in \"Misc\" tab in options (click Niblet's head):<ul>" + 
				 "<li>Display \"Go To Issue Number\" Box</li>" +
				 "<li>Suppress popups (Issue Edit and/or All)</li>" +
				 "<li>Display Account Manager on Server Edit</li>" +
				 "<li>Issue Edit window scrolling fix</li>" +
				 "<li>Copy without Silverlight</li>" +
				 "<li>Promote issue edit clickable spans to links</li>" +
				 "<li>Link Issue Subject</li>" +
				 "<li>Server search from Issue Edit</li>" +
				 "</ul></li>" +
				 "</ul>" +
				 "<p>Additionally, if you had the \"PRx Dev Site Modifications\" extension, <strong>it has been uninstalled</strong>, as this extension encompasses its functionality.</p>" +
				 "<p>Hit the more info button below for the full details.</p>"
	},

	"1.0.1": {
		sameAs: "1.0"
	},

	"1.0.2": {
		sameAs: "1.0"
	},

	"1.0.3": {
		sameAs: "1.0"
	},

	"1.0.4": {
		sameAs: "1.0"
	},

	"1.0.5": {
		heading: "Programmer Enhancement Suite Update",
		message: "New Omnibox commands for location and server searching (Type \"nib help\" into the Omnibox for more information)" + 
			"<ul>" +
			"<li>nib locations (location search)</li>" +
			"<li>nib locations [location name] (location search for name)</li>" +
			"<li>nib locations [location id] (location edit for ID)</li>" +
			"<li>nib servers (server search)</li>" +
			"<li>nib servers [location name] (server search for name)</li>" +
			"<li>nib servers [location id] (server search for LocationID)</li>" +
			"</ul>"
	},

	"1.0.6": {
		heading: "Programmer Enhancement Suite Minor Update",
		message: "" + 
			"<ul>" +
			"<li>Bug fix for calculating date/times precisely.</li>" +
			"<li>Bug fix for \"Go to Daily Status\" button in notification when not clicked for a while.</li>" +
			"</ul>"
	},

	"1.0.7": {
		sameAs: "1.0.6"
	},

	"1.0.8": {
		heading: "Programmer Enhancement Suite Update (1.0.8)",
		message: "<ul>" +
			"<li>Go to Issue # in Issue <strong>Search</strong></li>" +
			"<li>Linked Subject in Issue <strong>Search</strong></li>" +
			"<li>Bug fix from 1.0.7 for hours at day end calculation</li>" +
			"<li>\"<code>nib q</code>\" command for Issue Search" +
			"<li>\"<code>nib divmanage</code>\" becomes \"<code>nib divpermissions</code>\"" +
			"<li>\"<code>nib divsearch</code>\" command added." +
			"<li>Type \"<code>nib help</code>\" for more info on nib commands.</li>" +
			"</ul>"
	},

	"1.0.9": {
		sameAs: "1.0.8"
	},

	"1.0.10": {
		heading: "Programmer Enhancement Suite Update (1.0.10)",
		message: "<ul>" +
			"<li>Highlighting Daily Status time updates stops the updates while the text is selected, so your selection is no longer cleared every second.</li>" +
			"<li>Added \"<code>nib queryissues</code>\" to Omnibox Help (1.0.9).</li>" +
			"</ul>"
	},

	"1.0.11": {
		heading: "Programmer Enhancement Suite Update (1.0.11)",
		message: "<ul>" +
			"<li>Bug fix for \"Time to Leave\" calculation when set to a time with minutes (e.g. 5:30 instead of 5:00).</li>" +
			"</ul>"
	},

	"1.0.12": {
		heading: "Programmer Enhancement Suite Update (1.0.12)",
		message: "<ul>" +
			"<li>Bug fix for \"Time to Leave Tomorrow\" calculation (usually on a Thursday) when clocked out.</li>" +
			"</ul>"
	},

	"1.0.13": {
		heading: "Programmer Enhancement Suite Update (1.0.13)",
		message: "<ul>" +
			"<li>Added checking for support requests (default but optional).</li>" +
			"<li>Improved popup handling.</li>" +
			"</ul>"
	},

	"1.0.14": {
		heading: "Programmer Enhancement Suite Update (1.0.14)",
		message: "<ul>" +
			"<li>Support requests are now checked on the DSR page (appears above time summary).</li>" +
			"<li>Support requests are now checked on the Issue List page (appears in Support Requests button).</li>" +
			"<li>\"Support Requests\" button is now a link you can right click to open in new tab on Issue List page.</li>" +
			"</ul>"
	},

	"1.0.15": {
		heading: "Programmer Enhancement Suite Update (1.0.15)",
		message: "<ul>" +
			"<li>Disabled \"Go to Issue\" box. Use the <code>\"nib i\"</code> omnibox command (use <code>\"nib help\"</code> in the omnibox for more information) instead.</li>" +
			"<li>Global shortcut to toggle extension being enabled (<code>Ctrl+Shift+A</code>).<br /><br />" +
			"You may change this shortcut in Chrome's extension settings at the bottom of the page.</li>" +
			"</ul>"
	},

	"1.0.16": {
		sameAs: "1.0.15"
	},

	"1.0.17": {
		heading: "Programmer Enhancement Suite Update (1.0.17)",
		message: "<ul>" +
			"<li>Disabled \"Go to Issue\" box. Use the <code>\"nib i\"</code> omnibox command (use <code>\"nib help\"</code> in the omnibox for more information) instead.</li>" +
			"<li>Global shortcut to toggle extension being enabled (<code>Ctrl+Shift+A</code>).<br /><br />" +
			"You may change this shortcut in Chrome's extension settings at the bottom of the page.<br /><br />" +
			"<strong>You must set this shortcut yourself</strong> if you already had the extension installed. I suggest <code>Ctrl+Shift+A</code> and <code>\"Global\"</code>.</li>" +
			"<li>New \"Distraction Free Mode\" option for Daily Status (default is on).<br /><br />" +
            "This prevents detailed Daily Status information from distracting you unless you click the \"Total\" label to zoom in and display more information.</li>" +
            "<li>Cookie monster Chrome permissions are now required rather than using jQuery and message passing.</a>." +
			"</ul>"
	},

	"1.0.18": {
		heading: "Programmer Enhancement Suite Update (1.0.18)",
		message: "<ul>" +
			"<li>Disabled \"Go to Issue\" box. Use the <code>\"nib i\"</code> omnibox command (use <code>\"nib help\"</code> in the omnibox for more information) instead.</li>" +
			"<li>Global shortcut to toggle extension being enabled (<code>Ctrl+Shift+A</code>).<br /><br />" +
			"You may change this shortcut in Chrome's extension settings at the bottom of the page.<br /><br />" +
			"<strong>You must set this shortcut yourself</strong> if you already had the extension installed. I suggest <code>Ctrl+Shift+A</code> and <code>\"Global\"</code>.</li>" +
			"<li>New \"Distraction Free Mode\" option for Daily Status (default is on).<br /><br />" +
            "This prevents detailed Daily Status information from distracting you unless you click the \"Total\" label to zoom in and display more information.</li>" +
            "<li>Cookie monster Chrome permissions are now required rather than using jQuery and message passing.</li>" +
			"</ul>"
	},

	"1.0.19": {
		heading: "Programmer Enhancement Suite Update (1.0.20)",
		message: "<ul>" +
			"<li>Distraction-Free Mode has been improved.</li>" +
			"<li>Bug Fix: Cookie handling.</li>" +
			"</ul>"
	},

	"1.0.20": {
		sameAs: "1.0.19"
	},

	"1.0.21": {
		heading: "Programmer Enhancement Suite Update (1.0.21)",
		message: "<ul>" +
			"<li>DSR details auto-collapse after 30 seconds when Distraction-Free Mode is enabled.</li>" +
			"</ul>"
	},

	"1.0.22": {
		sameAs: "1.0.21"
	},

	"1.0.23": {
		sameAs: "1.0.21"
	},

	"1.0.24": {
		heading: "Programmer Enhancement Suite Update (1.0.24)",
		message: "<ul>" +
			"<li>Added <code>nib kb</code> omnibox command to search for KB articles.</li>" +
			"<li>Added <code>nib kb [number]</code> omnibox command to view specific KB articles by number.</li>" +
			"<li>Added <code>nib kb [search term]</code> omnibox command to search for terms directly in KB articles.</li>" +
			"<li>Changed <code>nib calendar</code> omnibox command to use the new calendar link.</li>" +
			"<li>Use the omnibox command <code>\"nib help\"</code> for more information on omnibox command changes.</li>" +
			"<li>Fixed location search from omnibox with spaces in the name.</li>" +
			"<li>Changed omnibox commands to all use HTTPS requests.</li>" +
			"</ul>"
	}
};