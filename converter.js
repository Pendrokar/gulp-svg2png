"use strict";
/*global phantom: false*/

var webpage = require("webpage");

if (phantom.args.length !== 5) {
    console.error("Usage: converter.js source dest width height scale");
    phantom.exit();
} else {
    convert(phantom.args[0], phantom.args[1], Number(phantom.args[2]), Number(phantom.args[3]), Number(phantom.args[4]));
}

function convert(source, dest, width, height, scale) {
    var page = webpage.create();

    page.open(source, function (status) {
        if (status !== "success") {
            console.error("Unable to load the source file.");
            phantom.exit();
            return;
        }

        try {
            var targetWidth = width;
            var targetHeight = height;
            var dimensions = getSvgDimensions(page);
            if(!width || !height)
            {
                targetWidth = width || Math.round(dimensions.width); // * scale
                targetHeight = height || Math.round(dimensions.height); // * scale
            }

            if(scale && dimensions.shouldScale)
            {
                targetWidth = Math.round(targetWidth * scale);
                targetHeight = Math.round(targetHeight * scale);
            }

            page.viewportSize = {
                width: targetWidth,
                height: targetHeight
            };
            // TODO: NOT SURE WHAT TO DO WITH ZOOMFACTOR
            //if (dimensions.shouldScale) {
            //    page.zoomFactor = scale;
            //}
        } catch (e) {
            console.error("Unable to calculate dimensions.");
            console.error(e);
            phantom.exit();
            return;
        }

        // This delay is I guess necessary for the resizing to happen?
        setTimeout(function () {
            page.render(dest);
            phantom.exit();
        }, 0);
    });
}

function getSvgDimensions(page) {
    return page.evaluate(function () {
        /*global document: false*/

        var el = document.documentElement;
        var bbox = el.getBBox();

        var width = el.getAttribute("width");
        var height = el.getAttribute("height");
        var widthInPercent = false;
        var heightInPercent = false;
        var hasWidthOrHeight = width || height;
        if(hasWidthOrHeight)
        {
            if(width.length > 0 && width.substr(-1) === "%")
            {
                widthInPercent = true;
            }
            if(height.length > 0 && height.substr(-1) === "%")
            {
                heightInPercent = true;
            }
        }
        if(width)
        {
            width = parseFloat(width);
        }
        if(width)
        {
            height = parseFloat(height);
        }
        var viewBoxWidth = el.viewBox.animVal.width;
        var viewBoxHeight = el.viewBox.animVal.height;
        var usesViewBox = viewBoxWidth && viewBoxHeight;

        if (usesViewBox) {
            if (width && !height) {
                height = width * viewBoxHeight / viewBoxWidth;
            }
            if (height && !width) {
                width = height * viewBoxWidth / viewBoxHeight;
            }
            if (
                (!width && !height)
            ) {
                width = viewBoxWidth;
                height = viewBoxHeight;
            }
            if (widthInPercent && heightInPercent) {
                width = viewBoxWidth * width / 100;
                height = viewBoxHeight * height / 100;
            }
        }

        if (!width) {
            width = bbox.width + bbox.x;
        }
        if (!height) {
            height = bbox.height + bbox.y;
        }

        return { width: width, height: height, shouldScale: hasWidthOrHeight || !usesViewBox };
    });
}
