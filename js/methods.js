var normalised_height = 1000;
var normalised_area = 100000;

/**
 * In place converts an array of wavelengths (in Angstroms) from air wavelength
 * to vacuum wavelength
 *
 * @param lambda an array of wavelengths
 */
function convertVacuumFromAir(lambda) {
    for (var i = 0; i < lambda.length; i++) {
        lambda[i] = lambda[i] * (1 + 2.735192e-4 + (131.4182/Math.pow(lambda[i], 2)) + (2.76249E8 /Math.pow(lambda[i], 4)));
    }
}
/**
 * In place converts an array of log (base 10) wavelengths (log(Angstroms)) from air wavelength
 * to vacuum wavelength
 *
 * @param lambda an array of log wavelengths
 */
function convertVacuumFromAirWithLogLambda(lambda) {
    for (var i = 0; i < lambda.length; i++) {
        var l = Math.pow(10, lambda[i]);
        lambda[i] = Math.log(l * (1 + 2.735192e-4 + (131.4182/Math.pow(l, 2)) + (2.76249E8 /Math.pow(l, 4))))/Math.LN10;
    }
}
/**
 * Redshifts a singular wavelength
 * @param lambda the wavelength to redshift
 * @param z the redshift to apply
 * @returns {number} the redshifted wavelength
 */
function shiftWavelength(lambda, z) {
    return (1+z)*lambda;
}
/**
 * Converts a single wavelength in Angstroms from air to vacuum
 * @param lambda the wavelength to convert
 * @returns {number} the vacuum wavelength
 */
function convertSingleVacuumFromAir(lambda) {
    return lambda * (1 + 2.735192e-4 + (131.4182/Math.pow(lambda, 2)) + (2.76249E8 /Math.pow(lambda, 4)));
}
/**
 * Converts the equispaced linear scale of the given lambda into an equispaced log scale.
 * Interpolates intensity and variance to this new scale.
 *
 * @param lambda
 * @param intensity
 */
function convertLambdaToLogLambda(lambda, intensity, numel, quasar) {
    if (typeof numel === 'undefined') numel = arraySize;
    var s = quasar ? startPowerQ : startPower;
    var e = quasar ? endPowerQ : endPower;
    var logLambda = linearScale(s, e, numel);
    var rescale = logLambda.map(function(x) { return Math.pow(10, x);});
    var newIntensity = interpolate(rescale, lambda, intensity);
    return {lambda: logLambda, intensity: newIntensity};
}

/**
 * Performs a fast smooth on the data via means of a rolling sum
 * @param y the array of values which to smooth
 * @param num the number of pixels either side to smooth (not the window size)
 * @returns {Array} the smoothed values
 */
function fastSmooth(y, num) {
    //TODO: LOOK AT THIS AGAIN, RESULTS FOR HIGH NUM SEEM WEIRD
    if (num == 0) {
        return y;
    }
    num += 1;
    var frac = 2*num + 1;
    // Remove NaNs
    for (var i = 0; i < y.length; i++) {
        if (isNaN(y[i])) {
            if (i == 0) {
                y[i] = 0;
            } else {
                y[i] = y[i - 1];
            }
        }
    }
    // Get initial sum
    var rolling = 0;
    for (var i = 0; i < num; i++) {
        rolling += y[i];
    }
    // Average it
    var d = [];
    for (var i = 0; i < y.length; i++) {
        if (i >= num) {
            rolling -= y[i - num];
        }
        if (i <= y.length - num) {
            rolling += y[i + num]
        }
        d.push(rolling / frac);
    }
    return d;
}

/**
 * Normalises a set of arrays containing x and y coordinates respectively such that the
 * returned result only contains elements between the bounds, and the y bounds are normalised
 * to the input height relative to a minimum value.
 *
 * @param xs
 * @param ys
 * @param xMin
 * @param xMax
 * @param yMin
 * @param height
 * @returns {{xs: Array, ys: Array}}
 */
function normaliseSection(xs, ys, xMin, xMax, yMin, height) {
    var xBounds = getXBounds(xs, xMin, xMax);
    var bounds = findMinAndMaxSubset(ys, xBounds.start, xBounds.end);
    var r = height/(bounds.max - bounds.min);
    var xss = xs.slice(xBounds.start, xBounds.end);
    var yss = ys.slice(xBounds.start, xBounds.end);
    for (var i = 0; i < yss.length; i++) {
        yss[i] = yMin + r * (yss[i] - bounds.min);
    }
    return {xs: xss, ys: yss};

}

/**
 * Takes an input array of x values and returns indexes corresponding to the first and last index
 * that has the x value within the specific bounds
 *
 * @param xs
 * @param xMin
 * @param xMax
 * @returns {{start: {Number}, end: {Number}}}
 */
function getXBounds(xs, xMin, xMax) {
    //TODO: Log time complexity should be easy to do here if ordered
    var start = null;
    var end = null;
    for (var i = 0; i < xs.length; i++) {
        if (xs[i] > xMin && start == null) {
            start = i - 1;
        }
        if (xs[i] > xMax && end == null) {
            end = i + 1;
        }
    }
    if (start == null) {
        start = xs.length - 1;
    } else if (start < 0) {
        start = 0;
    }
    if (end == null) {
        end = xs.length;
    } else if (end < 0) {
        end = 0;
    }
    return {start: start, end: end};
}
/**
 * In place normalises the input array (and variance) such that the array
 * is a specific area in size, and returns the calculated normalisation ratio.
 * @param array
 * @param variance
 * @param val
 * @returns {number}
 */
function normaliseViaArea(array, variance, val) {
    var a = val == null ? normalised_area : val;
    var area = getAreaInArray(array, 0, array.length - 1);
    if (area == 0) return;
    var r = a / area;
    for (var j = 0; j < array.length; j++) {
        array[j] = array[j] * r;
        if (variance != null) {
            variance[j] = variance[j] * r;
        }
    }
    return r;
}
/**
 * In place scales an array to the scale factor given.
 * @param array
 * @param r
 */
function scale(array, r) {
    for (var i = 0; i < array.length; i++) {
        array[i] *= r;
    }
}
/**
 * In place adds the second array argument onto the first, such that the result of
 * the addition is found in the first array passed in.
 * @param original
 * @param addition
 */
function add(original, addition) {
    for (var i = 0; i < original.length; i++) {
        original[i] += addition[i];
    }
}

/**
 * Normalises an input array to fit between the bottom and top limits via applying a linear ratio.
 * An optional array can be passed in to the end that will also undergo normalisation to the same
 * ratio as the first array if it is specified.
 *
 * @param array
 * @param bottom
 * @param top
 * @param optional
 */
function normaliseViaShift(array, bottom, top, optional) {
    var min = 9e9;
    var max = -9e9;
    for (var j = 0; j < array.length; j++) {
        if (array[j] > max) {
            max = array[j];
        }
        if (array[j] < min) {
            min = array[j];
        }
    }
    var r = (top-bottom)/(max-min);
    for (var j = 0; j < array.length; j++) {
        var newVal = bottom + r*(array[j]-min);
        if (optional != null) {
            optional[j] = bottom + r*(optional[j]- min);
        }
        array[j] = newVal;
    }
}
/**
 * Loops through an array to find the minimum and maximum values in it
 * @param array
 * @returns {{min: number, max: number}}
 */
function findMinAndMax(array) {
    var min = 9e9;
    var max = -9e9;
    for (var j = 0; j < array.length; j++) {
        if (array[j] > max) {
            max = array[j];
        }
        if (array[j] < min) {
            min = array[j];
        }
    }
    return {min: min, max: max};
}
/**
 * Finds the minimum and maximum of an array between two index bounds
 *
 * @param xs
 * @param ys
 * @param start
 * @param end
 * @returns {{min: number, max: number}}
 */
function findMinAndMaxSubset(ys, start, end) {
    var min = 9e9;
    var max = -9e9;
    for (var j = start; j < end; j++) {
        if (ys[j] > max) {
            max = ys[j];
        }
        if (ys[j] < min) {
            min = ys[j];
        }
    }
    return {min: min, max: max};
}

/**
 * Iterates through an array and replaces NaNs with the value immediately prior to the NaN,
 * setting the first element to zero if it is NaN
 * @param y
 */
function removeNaNs(y) {
    for (var i = 0; i < y.length; i++) {
        if (isNaN(y[i])) {
            if (i == 0) {
                y[i] = 0;
            } else {
                y[i] = y[i - 1];
            }
        }
    }
}
/**
 * In place crops an array to the maximum value specified.
 * @param array
 * @param maxValue
 */
function cropSky(array, maxValue) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] > maxValue) {
            array[i] = maxValue;
        }
    }
}
/**
 * Returns the average value in an array. Requires the array not contain NaNs.
 * @param array
 * @returns {number}
 */
function getAverage(array) {
    var sum = 0;
    for (var i = 0; i < array.length; i++) {
        sum += array[i];
    }
    return sum / array.length;
}

/**
 * Returns the area in an array subsection
 *
 * @param array to read through
 * @param start start index
 * @param end INCLUSIVE end index
 */
function getAreaInArray(array, start, end) {
    var area = 0;
    if (start == null || start < 0) start = 0;
    if (end == null) {
        end = array.length - 1;
    } else if (end > array.length) {
        end = array.length - 1;
    }
    for (var i = start; i <= end; i++) {
        area += Math.abs(array[i]);
    }
    return area;
}
/**
 * Creates a linear scale of num points between and start and an end number
 * @param start
 * @param end
 * @param num
 * @returns {Array}
 */
function linearScale(start, end, num) {
    var result = [];
    for (var i = 0; i < num; i++) {
        var w0 = 1 - (i/(num-1));
        var w1 = 1 - w0;
        result.push(start*w0 + end*w1);
    }
    return result;
}
/**
 * Returns a linear scale of num points between redshifted start and end values
 * @param start
 * @param end
 * @param redshift
 * @param num
 * @returns {Array}
 */
function linearScaleFactor(start, end, redshift, num) {
    return linearScale(start*(1+redshift), end*(1+redshift), num);
}
/**
 * Linearly interpolates a data set of xvals and yvals into the new x range found in xinterp.
 * The interpolated y vals are returned, not modified in place.
 *
 * This function will NOT interpolate to zero the interpolation values do not overlap
 * @param xinterp
 * @param xvals
 * @param yvals
 * @returns {Array} Array of interpolated y values
 */
function interpolate(xinterp, xvals, yvals) {
    if (xinterp == null || xinterp.length < 2) {
        console.log("Don't use interpolate on a null, empty or single element array");
        return null;
    }
    var start_x = null;
    var end_x = null;
    var xval_start_index = null;
    var xval_end_index = null;
    var result = [];
    for (var i = 0; i < xinterp.length; i++) {
        start_x = i == 0 ? null : (xinterp[i] + xinterp[i - 1]) / 2;
        end_x = i == xinterp.length - 1 ? null : (xinterp[i + 1] + xinterp[i]) / 2;
        if (start_x == null) {
            start_x = 2 * xinterp[i] - end_x;
        }
        if (end_x == null) {
            end_x = 2 * xinterp[i] - start_x;
        }
        // If we have done the previous step, just move to next (touching) block to avg
        if (xval_end_index != null) {
            xval_start_index = xval_end_index;
        } else {
            xval_start_index = findCorrespondingFloatIndex(xvals, start_x);
        }
        xval_end_index = findCorrespondingFloatIndex(xvals, end_x, Math.floor(xval_start_index));
        result.push(getAvgBetween(yvals, xval_start_index, xval_end_index));
    }
    return result;
}
/**
 * Helper function for the interpolation method, which locates a linearly interpolated
 * floating point index that corresponds to the position of value x inside array xs.
 * @param xs
 * @param x
 * @param optionalStartIndex
 * @returns {Number} the floating point effective index
 */
function findCorrespondingFloatIndex(xs, x, optionalStartIndex) {
    var s = optionalStartIndex;
    if (s == null) s = 0;
    for (var i = s; i < xs.length; i++) {
        if (xs[i] < x) {
            continue;
        } else {
            if (i == 0) return i;
            return (i - 1) + (x - xs[i - 1])/(xs[i] - xs[i - 1]);
        }
    }
}

/**
 * Returns the average value between a start and end index
 * @param xvals
 * @param start
 * @param end
 * @returns {number}
 */
function getAvgBetween(xvals, start, end) {
    var c = 0;
    var r = 0;
    for (var i = Math.floor(start); i <= Math.ceil(end); i++) {
        var weight = 1;
        if (i == Math.floor(start)) {
            weight = 1 - (start - Math.floor(i));
        } else if (i == Math.ceil(end)) {
            weight = 1 - (Math.ceil(end) - end)
        }
        r += weight * xvals[i];
        c += weight;
    }
    if (c == 0) {
        return 0;
    } else {
        return r / c;
    }
}
/**
 * In place subtracts a polynomial fit (polynomial degree set in config.js as polyDeg),
 * and returns the array of values that form the polynomial
 * @param lambda
 * @param intensity
 * @returns {Array}
 */
function subtractPolyFit(lambda, intensity) {
    var r = polyFit(lambda, intensity);
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] = intensity[i] - r[i];
    }
    return r;
}
/**
 * Calculates a polynomial fit to the input x and y data sets. Polynomial degree
 * set in config.js as polyDeg.
 * @param lambda
 * @param intensity
 * @returns {Array}
 */
function polyFit(lambda, intensity) {
    var data = [];
    var r = [];
    for (var i = 0; i < intensity.length; i++) {
        data.push([lambda[i], intensity[i]]);
    }
    var result = polynomial(data, polyDeg).equation;
    for (var i = 0; i < intensity.length; i++) {
        var y = 0;
        for (var j = 0; j < result.length; j++) {
            y += result[j] * Math.pow(lambda[i], j);
        }
        r.push(y);
    }
    return r;
}

/**
 * Checks to see if the index is bad
 * @param intensity
 * @param variance
 * @param index
 */
function badIndex(intensity, variance, index) {
    var i = intensity[index];
    var v = variance[index];
    return isNaN(i) || isNaN(v) || i == null || v == null || i > maxVal || i < minVal || v < 0;
}

/**
 * Replaces NaNs with an average over numPoints to either side.
 * Sets the variance to null so the point isn't counted.
 * @param intensity
 * @param variance
 * @param numPoints
 */
function removeBadPixels(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
        if (badIndex(intensity, variance, i)) {
            var r = 0;
            var e = 0;
            var c = 0;
            for (var j = i - numPoints; j < (i + 1 + numPoints); j++) {
                if (j >= 0 && j < intensity.length && !badIndex(intensity, variance, j)) {
                    c++;
                    r += intensity[j];
                    e += variance[j];
                }
            }
            if (c != 0) {
                r = r / c;
                e = e / c;
            }
            intensity[i] = r;
            variance[i] = e;
        }
    }
}

/**
 *  Removes cosmic rays from the data by removing any points more than 5 rms dev apart
 *
 * @param intensity
 * @param variance
 */
function removeCosmicRay(intensity, variance) {
    for (var n = 0; n < cosmicIterations; n++) {
        var rms = 0;
        var mean = 0;
        for (var i = 0; i < intensity.length; i++) {
            mean += intensity[i];
        }
        mean = mean / intensity.length;
        for (var i = 0; i < intensity.length; i++) {
            rms += Math.pow(intensity[i] - mean, 2);
        }
        rms = rms / intensity.length;
        rms = Math.pow(rms, 0.5);
        for (var i = 0; i < intensity.length; i++) {
            if (Math.abs(intensity[i] - mean) < deviationFactor * rms) {
                continue;
            }
            var maxNeighbour = 0;
            if (i > 0) {
                maxNeighbour = Math.abs(intensity[i - 1] - intensity[i]);
            }
            if (i < intensity.length - 1) {
                maxNeighbour = Math.max(maxNeighbour, Math.abs(intensity[i + 1] - intensity[i]));
            }
            if (maxNeighbour > deviationFactor * rms) {
                var r = 0;
                var c = 0;
                for (var j = i - pointCheck; j < (i + 1 + pointCheck); j++) {
                    if (j >= 0 && j < intensity.length && Math.abs(intensity[j]-mean) < rms) {
                        c++;
                        r += intensity[j];
                    }
                }
                if (c != 0) {
                    r = r / c;
                }
                intensity[i] = r;
                variance[i] = max_error;
            }
        }
    }
}

function rollingPointMean(intensity, numPoints, falloff) {
    var d = [];
    var weights = [];
    var total = 0;
    for (var i = 0; i < 2*numPoints + 1; i++) {
        var w = Math.pow(falloff, Math.abs(numPoints - i));
        weights.push(w);
        total += w;
    }
    for (var i = 0; i < intensity.length; i++) {
        var c = 0;
        var r = 0;
        for (var j = i - numPoints; j <= i + numPoints; j++) {
            if (j> 0 && j < intensity.length) {
                r += intensity[j] * weights[c];
                c++;
            }
        }
        r = r / total;
        d.push(r);
    }
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] = d[i];
    }
}
function getMean(data) {
    var r = 0;
    for (var i = 0; i < data.length; i++) {
        r += data[i];
    }
    return r / data.length;
}
function stdDevSubtract(data, subtract) {
    var subtracted = data.map(function(x, ind) { return x - subtract[ind]; });
    var mean = getMean(subtracted);
    var r = 0;
    for (var i = 0; i < subtracted.length; i++) {
        r += (subtracted[i] - mean)*(subtracted[i] - mean);
    }
    return Math.sqrt(r / subtracted.length);
}
/**
 * //TODO: ADD DOC
 * @param lambda
 * @param intensity
 */
function polyFitReject(lambda, intensity) {
    var l = lambda.slice();
    var int = intensity.slice();
    for (var i = 0; i < polyFitInteractions; i++) {
        var fit = polynomial2(l, int, polyDeg);
        var stdDev = stdDevSubtract(int, fit.points);
        var c = 0;
        for (var j = 0; j < int.length; j++) {
            if (Math.abs((int[j] - fit.points[j]) / stdDev) > polyFitRejectDeviation) {
                int.splice(j, 1);
                l.splice(j, 1);
                fit.points.splice(j, 1);
                j--;
                c++;
            }
        }
        if (c == 0) {
            break;
        }
    }
    var final = lambda.map(function(val) {
        var r = 0;
        for (var j = 0; j < fit.equation.length; j++) {
            r += fit.equation[j] * Math.pow(val, j);
        }
        return r;
    });

    for (var i = 0; i < intensity.length; i++) {
        intensity[i] -= final[i];
    }

    return final;
}
function subtract(data, subtract) {
    for (var i = 0; i < data.length; i++) {
        data[i] -= subtract[i];
    }
}
function smoothAndSubtract(intensity) {
    var medians = medianFilter(intensity, medianWidth);
    var smoothed = boxCarSmooth(medians, smoothWidth);
    subtract(intensity, smoothed);
}

function applySpectralLineWeighting(lambda, spec) {
    var spectralLines = new SpectralLines();
    var lines = spectralLines.getAll();
    var weights = [];
    for (var i = 0; i < lambda.length; i++) {
        weights.push(baseWeight);
    }
    for (var j = 0; j < lines.length; j++) {
        for (var k = 0; k < weights.length; k++) {
            weights[k] += Math.exp(-1*Math.pow(lambda[k] - lines[j].logWavelength, 2) / gaussianWidth);
        }
    }

    for (var m = 0; m < spec.length; m++) {
        spec[m] *= Math.min(1, weights[m]);
    }

//    console.log("weights = " + JSON.stringify(weights) + ";");
//    console.log("spec = " + JSON.stringify(spec) + ";");
}

function medianFilter(data, window) {
    var result = [];
    var win = [];
    var num = (window - 1)/2;
    for (var i = 0; i < num + 2; i++) {
        win.push(data[0]);
    }
    for (var i = 0; i < num - 1; i++) {
        win.push(data[i]);
    }
    for (var i = 0; i < data.length; i++) {
        var index = i + num;
        if (index >= data.length) {
            win.push(data[data.length - 1]);
        } else {
            win.push(data[index]);
        }
        win.splice(0, 1);
        result.push(win.slice().sort(function(a,b){return a-b;})[num]);
    }
    return result;
}

function boxCarSmooth(data, window) {
    var result = [];
    var win = [];
    var running = 0;
    var num = (window - 1)/2;
    for (var i = 0; i < num + 2; i++) {
        win.push(data[0]);
        running += win[win.length - 1];
    }
    for (var i = 0; i < num - 1; i++) {
        win.push(data[i]);
        running += win[win.length - 1];
    }
    for (var i = 0; i < data.length; i++) {
        var index = i + num;
        if (index >= data.length) {
            win.push(data[data.length - 1]);
        } else {
            win.push(data[index]);
        }
        running += win[win.length - 1];
        running -= win.splice(0,1)[0];
        result.push(running / window);
    }
    return result;
}

function cosineTaper(intensity, zeroPixelWidth, taperWidth) {
    for (var i = 0; i < zeroPixelWidth; i++) {
        var inverse = intensity.length - 1 - i;
        intensity[i] = 0;
        intensity[inverse] = 0;
    }
    var frac = 0.5 * Math.PI / taperWidth;
    for (var i = 0; i < taperWidth; i++) {
        var inverse = intensity.length - 1 - i;
        var rad = i * frac;
        intensity[i + zeroPixelWidth] *= Math.sin(rad);
        intensity[inverse - zeroPixelWidth] *= Math.sin(rad);
    }
}

function taperSpectra(intensity) {
    cosineTaper(intensity, zeroPixelWidth, taperWidth);
}
function broadenError(data, window) {
    var result = [];
    var win = [];
    var num = (window - 1)/2;

    for (var i = 0; i < data.length; i++) {
        if (data[i] < max_error) {
            while (win.length < num + 2) {
                win.push(data[i]);
            }
            break;
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (win.length < window) {
            if (data[i] < max_error) {
                win.push(data[i]);
            }
        } else {
            break;
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (data[i] < max_error) {
            var index = i + num;
            while (index < data.length && data[index] >= max_error) {
                index++;
            }
            if (index >= data.length) {
                win.push(win[win.length - 1]);
            } else {
                win.push(data[index]);
            }
            win.splice(0, 1);
            result.push(win.slice().sort(function(a,b){return b-a;})[0]);
        } else {
            result.push(data[i]);
        }
    }
    for (var i = 0; i < result.length; i++) {
        data[i] = result[i];
    }
}
function maxMedianAdjust(data, window, errorMedianWeight) {
    var result = [];
    var win = [];
    var num = (window - 1)/2;
    for (var i = 0; i < data.length; i++) {
        if (data[i] < max_error) {
            while (win.length < num + 2) {
                win.push(data[i]);
            }
            break;
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (win.length < window) {
            if (data[i] < max_error) {
                win.push(data[i]);
            }
        } else {
            break;
        }
    }
    for (var i = 0; i < data.length; i++) {
        if (data[i] < max_error) {
            var index = i + num;
            while (index < data.length && data[index] >= max_error) {
                index++;
            }
            if (index >= data.length) {
                win.push(win[win.length - 1]);
            } else {
                win.push(data[index]);
            }
            win.splice(0, 1);
            result.push(errorMedianWeight * win.slice().sort(function(a,b){return a-b;})[num]);
        } else {
            result.push(data[i]);
        }
    }
    for (var i = 0; i < result.length; i++) {
        data[i] = result[i];
    }
    for (var i = 0; i < data.length; i++) {
        if (result[i] > data[i]) {
            data[i] = result[i];
        }
    }
}
function adjustError(variance) {
    broadenError(variance, broadenWindow);
    maxMedianAdjust(variance, errorMedianWindow, errorMedianWeight);
}

function divideByError(intensity, variance) {
    for (var i = 0; i < intensity.length; i++) {
//        intensity[i] = intensity[i] / (variance[i] * variance[i]);
        intensity[i] = intensity[i] / variance[i];
    }
}
function findMean(data) {
    var result = 0;
    for (var i = 0; i < data.length; i++) {
        result += data[i];
    }
    return result / data.length;
}
function absMean(data) {
    var running = 0;
    for (var i = 0; i < data.length; i++) {
        running += Math.abs(data[i]);
    }
    return running / data.length;
}
function absMax(data) {
    return data.map(function(x) { return Math.abs(x); }).sort(function(a,b){return b-a;})[0];
}
function normaliseMeanDev(intensity, clipValue) {
    var running = true;
    while (running) {
        var meanDeviation = absMean(intensity);
        var clipVal = (clipValue + 0.01) * meanDeviation;
        if (absMax(intensity) > clipVal) {
            for (var i = 0; i < intensity.length; i++) {
                if (intensity[i] > clipVal) {
                    intensity[i] = clipVal;
                } else if (intensity[i] < -clipVal) {
                    intensity[i] = -clipVal;
                }
            }
        } else {
            running = false;
        }
    }
    for (var i = 0; i < intensity.length; i++) {
        intensity[i] /= meanDeviation;
    }
}

function normalise(intensity) {
    normaliseMeanDev(intensity, clipValue);
}
function circShift(data, num) {
    var temp = data.slice();
    var l = data.length;
    for (var i = 0; i < l; i++) {
        data[i] = temp[(i + num) % l];
    }
}

function pruneResults(final, template) {
    return final.slice(template.startZIndex, template.endZIndex);
}
function subtractMeanReject(final, trimAmount) {
    var num = Math.floor((trimAmount * final.length)/2);
    var sorted = final.slice().sort(function(a,b) { return a-b });
    sorted = sorted.splice(num, sorted.length - (2*num));
    var mean = findMean(sorted);
    for (var i = 0; i < final.length; i++) {
        final[i] -= mean;
    }
}
function getPeaks(final, both) {
    if (typeof both === 'undefined') both = true;
    var is = [];
    var vals = [];
    for (var i = 2; i < final.length - 2; i++) {
        if (final[i] >= final[i + 1] && final[i] >= final[i+2] && final[i] > final[i - 1] && final[i] > final[i - 2]) {
            vals.push(final[i]);
            is.push(i);
        } else if (both && (final[i] <= final[i + 1] && final[i] <= final[i+2] && final[i] < final[i - 1] && final[i] < final[i - 2])) {
            vals.push(final[i]);
            is.push(i);
        }
    }
    return {index: is, value: vals};
}
function getRMS(data) {
    var mean = 0;
    for (var i = 0; i < data.length; i++) {
        mean += data[i];
    }
    mean = mean / data.length;
    var squared = 0;
    for (var i = 0; i < data.length; i++) {
        squared += Math.pow((data[i] - mean), 2);
    }
    squared /= data.length;
    return Math.sqrt(squared);
}
function rmsNormalisePeaks(final) {
    var peaks = getPeaks(final).value;
    var rms = getRMS(peaks);
    for (var i = 0; i < final.length; i++) {
        final[i] /= rms;
    }
}
function normaliseXCorr(final) {
    subtractMeanReject(final, trimAmount);
    rmsNormalisePeaks(final);
    var peaks = getPeaks(final, false);
    var result = [];
    for (var i = 0; i < peaks.index.length; i++) {
        result.push({index: peaks.index[i], value: peaks.value[i]});
    }
    return result;
}


function getFit(template, xcor, val) {
    var startIndex = binarySearch(template.zs, val)[0] - Math.floor(fitWindow/2);
    var bestPeak = -9e9;
    var bestIndex = -1;
    for (var i = 0; i < fitWindow; i++) {
        var index = startIndex + i;
        if (index >=0 && index < xcor.length) {
            if (xcor[index] > bestPeak) {
                bestPeak = xcor[index];
                bestIndex = index;
            }
        }
    }
    return getRedshiftForNonIntegerIndex(template, fitAroundIndex(xcor, bestIndex));
}

function binarySearch(data, val) {
    var highIndex = data.length - 1;
    var lowIndex = 0;
    while (highIndex > lowIndex) {
        var index = Math.floor((highIndex + lowIndex) / 2);
        var sub = data[index];
        if (data[lowIndex] == val) {
            return [lowIndex, lowIndex];
        } else if (sub == val) {
            return [index, index];
        } else if (data[highIndex] == val) {
            return [highIndex, highIndex];
        } else if (sub > val) {
            if (highIndex == index) {
                return [lowIndex, highIndex];
            }
            highIndex = index
        } else {
            if (lowIndex == index) {
                return [lowIndex, highIndex];
            }
            lowIndex = index
        }
    }
    return [lowIndex, highIndex];
}

/**
 * Determines the cross correlation (and peaks in it) between a spectra and a template
 *
 * @param template A template data structure from the template manager. Will contain a pre-transformed
 * template spectrum (this is why initialising TemplateManager is so slow).
 * @param fft the Fourier transformed spectra
 * @returns {{id: String, zs: Array, xcor: Array, peaks: Array}} a data structure containing the id of the template, the redshifts of the template, the xcor
 * results of the template and a list of peaks in the xcor array.
 */
function matchTemplate(template, fft) {
    var fftNew = fft.multiply(template.fft);
    var final = fftNew.inverse();
    final = Array.prototype.slice.call(final);
    circShift(final, final.length/2);
    final = pruneResults(final, template);
    // UNCOMMENT SECTION BELOW TO GET XCOR RESULTS FOR QUASAR
    /*    if (template.id == '3') {
     debugger;
     }*/
    var finalPeaks = normaliseXCorr(final);
    /* if (template.id == '9') {
     console.log("xcor3 = " + JSON.stringify(final) + ";\nzs=" + JSON.stringify(template.zs) + ";");
     }*/
//    if (template.id == '6') {
//        console.log("xcor2 = " + JSON.stringify(final) + ";");
//    }
    return {
        id: template.id,
        zs: template.zs,
        xcor: final,
        peaks: finalPeaks
    };
}

function fitAroundIndex(data, index) {
    var d = data.slice(index - 1, index + 2).map(function(v,i) { return [index - 1 + i,v]; });
    var e = polynomial(d).equation;
    return -e[1]/(2*e[2]);
}

function getRedshiftForNonIntegerIndex(t, index) {
    var gap = t.lambda[1] - t.lambda[0];
    var num = t.lambda.length / 2;
    var z = (Math.pow(10, (index + t.startZIndex - num) * gap) * (1 + t.redshift)) - 1;
    return z;
}