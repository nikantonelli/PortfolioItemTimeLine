Portfolio Item Tree With Dependencies
=====================================

## Overview

Another take on the Portfolio Items page in Rally. This time using a dendogram style visualisation.

## Hierarchical Tree View
This app will find all the children of a particular Portfolio artefact (or set of artefacts). You can choose
the type of artefact then the top level artefact(s).

The colours of the circles indicate the state of progress from red (those that are not started), through to
blue (in their final stages). Click on the "Colour Codes" button to see the colour to state mapping for each
portfolio item type.

## Choosing collections
The app settings contains an option to allow you to multi-select the top level artefacts. This allows you to
choose a number of portfolio items of interest and then filter for the features

## Visualising Dependencies
The edge of the circle will be red if there are any dependencies (predecessors or successors) and the colour
of the associated text will indicate those with predecessors (red text) and those with successors (green text).
Those with both will appear as having predecessors.

If the text is blinking, it means that the relevant dependency is not being shown in this data set.

## Exploring the data
You can investigate dependencies by using shilft-CLICK on the circle. This will call up an overlay with the 
relevant dependencies. Clicking on the FormattedID on any artefact in the overlay will take you to it in 
either the EDP or QDP page (whichever you have enabled for your session ).

If you click on the circle without using shift, then a data panel will appear containing more information 
about that artefact.

## Filtering
There are app settings to enable the extra filtering capabilities on the main page, so that you can choose 
which lowest-level portfolio items to see, e.g. filter on Owner, Investment Type, etc.

To filter by release (e.g. to find all those features scheduled into a Program Increment) you will need to 
edit the Page settings (not the App Settings) to add a Release or Milestone filter.

It could be extended to include user stories, but that was not really useful info for the top level managers.

![alt text](https://github.com/nikantonelli/PortfolioItem-Tree/blob/master/Images/overview.png)
