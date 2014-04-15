function RScriptWrapper(script)
{
    this._script = script;
    this._functions = new Array();
    this.parseScript(script);
}

RScriptWrapper.prototype.submit = function() {

}

RScriptWrapper.prototype.parseScript = function(script) {
    if (script != null) {
        try {
            var result = script.match(/[\w.]+\s*<-\s*function\s*\x28([\w=\s,\"'\\.]*)\x29/g);
            if (result != null) {
                var rfunctions = [];
                for (var i = 0; i < result.length; i++) {
                    var funcObj = this.parseRFunction(result[i]);
                    if (funcObj != null) {
                        this._functions.push(funcObj);
                    }
                }
            }
        }
        catch (e) {
            alert(e);
        }
    }
}

RScriptWrapper.prototype.parseRFunction(rFunctionText)
{
  if (rFunctionText != null) {
      //alert(rFunctionText);
      var loc1 = rFunctionText.indexOf("<-");
      if (loc1 >= 0) {
          var funcObj = {};
          funcObj.functionName = rFunctionText.substring(0, loc1).trim();
          //alert(funcObj.functionName);
          var loc2 = rFunctionText.indexOf("(");
          var loc3 = rFunctionText.indexOf(")");
          if (loc2 >= 0 && loc3 > loc2) {
              var i = 1;
              // ignore all the white spaces between the left paranthesis and the first parameter
              while(rFunctionText[loc2 + i] == ' ' || rFunctionText[loc2 + i] == '\t')
                  i++;
              loc2 += i;
              var parameterstring = rFunctionText.substring(loc2, loc3);
              //alert(parameterstring);
              funcObj.parameters = [];
              if (parameterstring != null) {
                  var parametersplitted = parameterstring.split(",");
                  if (parametersplitted.length > 0)
                  {
                      for (var i = 0; i < parametersplitted.length; i++) {
                          var parametersplit = parametersplitted[i].split("=");
                          var parametername = parametersplit[0].trim();
                          //alert(parametername);
                          var param = {};
                          param.paramName = parametername;
                          funcObj.parameters.push(param);
                      }
                  }
              }
          }
          return funcObj;
      }
  }
  return null;
}