Portfolio Item Tree Time Line
=====================================

![alt text](https://github.com/nikantonelli/PortfolioItemTimeLine/blob/With-Stories/Images/overview.png)

## Overview

Another take on the Portfolio Timeline page in Rally: a string board for PI planning with drag'n'drop positioning for portfolio items (only). 

Option 1: after selecting a top level item, the app will find all the portfolio items attached to that and then lay them out using the PlannedStartDate and PlannedEndDate. The initial view will be today minus 30days until today plus 180 days, but you can set that in the app settings if you want to override it.

The lowest level portfolio items can be filtered based on the advanced filter settings. This means that you can look at just those items that are in a Release timebox, or just the things that are yours, etc.

Option 2: select a portfolio type and all those of that level found in the current context will be shown. The filters then apply to the level chosen.

You can make the view expand so that a particular item fills the dateline by clicking on the text of the title.  If you have finished with that view and want to return to the full view, just click on the white background

## Progress Bar Colouring

The span of the item is used as a progress bar and shows a colour going from left to right as far as the %-done field says. The %-done can be story points or story count vis the app settings. The colour chosen is based around the standard Rally algorithm of comparing the amount of work defined against the expected completion rate.

## Team Level Items

You can ask the app to fetch items in the work hierarchy. So that means you can get stories and defects (that are connected to stories only) into the view. If you put up the Iteration and Release timeboxes you can see  when things are scheduled

## Timeboxes

You can have just the timeline (no vertical colouring), timeline+releases, timeline+iterations or  timeline+release+iterations

## Dependencies

If you have a lot of portfolio items and only want to see those with dependencies, there is an app setting for that too. If you select a single level of portfolio item, then you will see them all. If you are still on the multi-level view, then only the lowest level portfolio item dependencies are shown (as the default).

Hover over a dependency link dot and it will give you the dependency popover. Hover over the bar and it will give you a small details panel. If you then decide you want to look at an item in more detail, click on the suitcase icon in the left end of the bar. This will open a either an FDP or QDP panel for the item. 

The dependencies are those that exist between the portfolio items. The user story dependencies are not considered in this app right now. However, you can get to them via the datapanel just mentioned.

The dependency lines can be shown for just the lowest level item (usually Features) or you can ask for all of them by an option in the app settings. If you ask for all of them, then the higher level portfolio item dependencies are shown by dashed lines. The dashes get bigger the higher up the portfolio hierarchy the items are. Feature dependencies remain as solid lines.

## Scheduling Errors

The dependency dots and lines on the bars are coloured when there is a discrepancy in the Planned dates compared with the items parent. E.g. the dates are outside the parent's ones. 

The text of a bar goes red as well (and this is independent of dependencies).

## Improving visibility

The up/down arrows to the far left of the bar will collapse/restore that portfolio item and it's corresponding children. Use shift-click to toggel the state of all the items at the same portfolio level as the one you clicked on. E.g. if they are all open, then shift-click on a Feature will close up all Features.

If you think the text is too small, you can set a "line size" in the options which will increase the bar width and the font size!

## Editing Items

The symbol on the left end of the bar will take you directly to the edit page for that item. If you update the start/end dates in the edit panel, then the view will redraw to reflect those changes. If the portfolio item does not have both the PlannedStart and PlannedEnd dates, then the symbol will be red

Now for the good bit..... YOU CAN DRAG AND DROP the items to change their dates. In this initial version, you can drag on the bar (not the text or icon) and you can push the item back and forth. The duration of the item does not change. If you want to change that, then click on the three bar symbol and manually modify the dates. Don't forget to save any changes using the button at the top before you do or they won't be reflected in the QDP. Alternatively, you can use the QDP to change them and the change will be removed from those outstanding (which can then be saved using the other button at the top).
