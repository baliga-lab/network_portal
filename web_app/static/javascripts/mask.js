var SVGMask = (function() {
    function SVGMask(focus) {
        this.focus = focus;
        this.mask  = this.focus.append("g").attr("class","mask");
        this.left  = this.mask.append("polygon");
        this.right = this.mask.append("polygon");
        this._x = null;
        this._y = null;
    }
    
    SVGMask.prototype.style = function(prop, val) {
        this.left.style(prop, val);
        this.right.style(prop, val);
        return this;
    }
    
    SVGMask.prototype.x = function(f) {
        if (f == null) {
            return this._x;
        }
        this._x = f;
        return this;
    };
    
    SVGMask.prototype.y = function(f) {
        if (f == null) {
            return this._y;
        }
        this._y = f;
        return this;
    };
    
    SVGMask.prototype.redraw = function() {
        var lp, maxX, maxY, minX, minY, rp, xDomain, yDomain;
        yDomain = this._y.domain();
        minY = yDomain[0];
        maxY = yDomain[1];
        xDomain = this._x.domain();
        minX = xDomain[0];
        maxX = xDomain[1];
        lp = {
            l: this._x(minX),
            t: this._y(minY),
            r: this._x(this.from),
            b: this._y(maxY)
        };
        rp = {
            l: this._x(this.to),
            t: this._y(minY),
            r: this._x(maxX),
            b: this._y(maxY)
        };
        //debugger
        this.left.attr("points", "" + lp.l + "," + lp.t + "  " + lp.r + "," + lp.t + "  " + lp.r + "," + lp.b + "  " + lp.l + "," + lp.b);
        this.right.attr("points", "" + rp.l + "," + rp.t + "  " + rp.r + "," + rp.t + "  " + rp.r + "," + rp.b + "  " + rp.l + "," + rp.b);
        return this;
    };
    
    SVGMask.prototype.reveal = function(extent) {
        this.from = extent[0];
        this.to = extent[1];
        this.redraw();
        return this;
    };
    
    return SVGMask;
    
})();