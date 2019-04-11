Portfolio Item Tree Time Line
=====================================

## Overview

Another take on the Portfolio Timeline page in Rally: a string board for PI planning

After selecting a top level item, the app will find all the portfoli items attached to that and then lay them out using the PlannedStartDate and PlannedEndDate. The initial view will be today minus 30days until today plus 180 days, but you can set that in the app settings if you want to override it.

You can make the view expand so that a particular item fills the dateline by clicking on the coloured bar associated with it (not the text).  If you have finished with that view and want to return to the full view, just click on the white background

The lowest level portfolio items can be filtered based on the advanced filter settings. This means that you can look at just those items that are in a Release timebox, or just the things that are yours, etc.

If you have a lot of features and only want to see those with dependencies, there is an app setting for that too.

Hover over a dependency link dot and it will give you the dependency popover. Hover over the bar and it will give you a small details panel. If you then decide you want to look at an item in more detail, use the shift key and hold while you click on the bar. This will open a modal dialog panel for the item. From there, you can click on the blue hyperlink to get to the usual QDP and FDP panels.

The dependencies are those that exist between the protfolio items. The user story dependencies are not considered in this app right now.

The dependency lines can be shown for just the lowest level item (usually Features) or you can ask for all of them by an option in the app settings. If you ask for all of them, then the higher level portfoli oitem dependencies are shown by dashed lines. The dashes get bigger the higher up the portfolio hierarchy the items are. Feature dependencies remain as solid lines.

The dots and lines on the bars and between the bars are coloured when there is a discrepancy in the Planned dates compared with the items parent. I.g. the dates are outside the parent's ones.

The left-pointing triangles to the left of the bars signify that there are items with dates that are before the start date of the view. Click on the triangle to zoom over to those dates (and click on the whitespace to go back).

If the portfolio item does not have both the PlannedStart and PlannedEnd dates, then instead of a triangle, there will be a red circle.

![alt text](https://github.com/nikantonelli/PortfolioItemTimeLine/blob/master/Images/overview.png)
