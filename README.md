Portfolio Item Tree Time Line
=====================================

## Overview

Another take on the Portfolio Timeline page in Rally: a string board for PI planning
![alt text](https://github.com/nikantonelli/PortfolioItemTimeLine/blob/Strings-board/Images/overview.png)

After selecting a top level item, the app will find all the portfolio items attached to that and then lay them out using the PlannedStartDate and PlannedEndDate. The initial view will be today minus 30days until today plus 180 days, but you can set that in the app settings if you want to override it.

You can make the view expand so that a particular item fills the dateline by clicking on the text of the title.  If you have finished with that view and want to return to the full view, just click on the white background

The lowest level portfolio items can be filtered based on the advanced filter settings. This means that you can look at just those items that are in a Release timebox, or just the things that are yours, etc.

If you have a lot of portfolio items and only want to see those with dependencies, there is an app setting for that too. If you select a single level of portfolio item, then you will see them all. If you are still on the multi-level view, then only the lowest level portfolio item dependencies are shown

Hover over a dependency link dot and it will give you the dependency popover. Hover over the bar and it will give you a small details panel. If you then decide you want to look at an item in more detail, use the ctrl key and hold while you click on the bar. This will open a modal dialog panel for the item. From there, you can click on the blue hyperlink to get to the usual QDP and FDP panels (see note below).

The dependencies are those that exist between the portfolio items. The user story dependencies are not considered in this app right now. However, you can get to them via the datapanel just mentioned.

The dependency lines can be shown for just the lowest level item (usually Features) or you can ask for all of them by an option in the app settings. If you ask for all of them, then the higher level portfolio item dependencies are shown by dashed lines. The dashes get bigger the higher up the portfolio hierarchy the items are. Feature dependencies remain as solid lines.

The dots and lines on the bars and between the bars are coloured when there is a discrepancy in the Planned dates compared with the items parent. E.g. the dates are outside the parent's ones. The border of a bar goes red as well (and this is independent of dependencies).

The up/down arrows to the far left of the screen will collapse/restore that portfolio item and it's corresponding children.

Note: The three-bar symbol on the left will take you directly to the edit page for that item. If you update the start/end dates in the edit panel, then the view will redraw to reflect those changes. If the portfolio item does not have both the PlannedStart and PlannedEnd dates, then the symbol will be red

Oh, and I shouldn't forget, if you think the text is too small, you can set a "line size" in the options which will increase the bar width and the font size!
