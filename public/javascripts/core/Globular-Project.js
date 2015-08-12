"use strict";

/*
    Project class
*/

/*
    Constructs a new project. If the argument is undefined, we are constructing
    this in the destringify routine, so we should do nothing. If it's empty,
    construct an empty project. Otherwise, destringify.
*/
function Project(s) {
    if (s === undefined) {
        return;
    }
    if (s === "") {
        this.diagram = null;
        this.signature = new Signature(null);

        // Holds an association between individual cell names in the signature and the colours assigned by the user (which can be non-unique)
        this.dataList = new Hashtable();

        // We pass a fresh newly created generator with a fresh name
        this.addZeroCell();

        // Hold a MapDiagram intended to be a source/target of a new rule. Kept here temporarily so that the target/source of the rule could be constructed
        this.cacheSourceTarget = null;
        return;
    }

    // Rebuild the project from the given string
    globular_destringify(s, this);
};

Project.prototype.getType = function() {
    return 'Project';
};

Project.prototype.applyStochasticProcess = function() {
    /*
        How will we assign rates to particular processes??; some array rates could have the same length as processes, processes associated
        to their specific rate via the same appropriate index; but how do we know which process is which in our processes array...
        Does getNCells go in order from the vertical side panel?  Currently it's random, but the processes are labelled--need html code to take
        whatever the user names the process and get that data back to us
    */

    var history = this.diagram; // history
    history.boost(); //this takes the identity
    var current_state = history.getTargetBoundary();
    var species = this.signature.get_NCells(1);
    var processes = this.signature.get_NCells(2);
    var possible_events = [];
    var rates = [];

    for (var i = 0; i < processes.length; i++) {
        rates[i] = this.get_rate(processes[i]);
    }
    for (var i = 0; i < processes.length; i++) {
        possible_events[i] = current_state.enumerate(this.dataList.get(processes[i]).diagram.getSourceBoundary());
    }
    var eventsWithTimes = [];
    /*for(var i = 0; i < possible_events.length; i++) {
        for(var j = 0; j < possible_events[i].length; j++){
            var negRateInverse = new Fraction(-1, rates[i]);
            possible_events[i][j] = [possible_events[i][j], (negRateInverse.toPrecision(4))*Math.log((Math.random()), processes[i]];  
            //we'll go with 4 decimal places of precision for rate for now...we can deal with the minor fluctuations of 
     
        }
	}*/
    for (var i = 0; i < possible_events.length; i++) {
        for (var j = 0; j < possible_events[i].length; j++) {
            eventsWithTimes.push(possible_events[i][j]);
        }
    }
    var indexNextEvent = -1;
    //first extract all the event times
    var eventTimes = [];
    for (var x = 0; x < eventsWithTimes.length; x++) {
        eventTimes.push(eventsWithTimes[x][1]);
    }
    var least = 2;
    var index = 0;
    for (var x = 0; x < eventsWithTimes.length; x++) {
        if (eventTimes[x] < least) {
            least = eventTimes[x];
            index = x;

        }
    }
    //so eventsWithTimes[index][0] is the event we want to execute
    /* var attached_event = this.signature.createDiagram(eventsWithTimes[index][2]);
     history.attach(attached_event, 't', eventsWithTimes[index][0]);
     this.renderDiagram();            
     var processData; */
    /*
        for each process (where processData[i] = the processData for processes[i]) list the user's name for the process,
        and the source and target of that process
    */
    /*
    for (i = 0; i < processes.length(); i++) {
        processData[i] = [this.getName(processes[i]), this.dataList.get(processes[i]).diagram.getSourceBoundary(),
        this.dataList.get(processes[i]).diagram.getTargetBoundary()]
    }
    for (i = 0; i < species.length; i++) {
        //update species at i
    }
    */
}

Project.prototype.displayInterchangers = function() {

    var interchangers = this.diagram.getInterchangers();
    //console.log(interchangers);
    var i = Math.floor(Math.random() * interchangers.length);
    this.diagram.rewrite(interchangers[i]);
    this.renderDiagram();
};


// This method returns the diagram currently associated with this project, this is used to maintain a complete separation between the front end and the core
Project.prototype.getDiagram = function() {
    return this.diagram;
};

// This method returns the signature currently associated with this project, this is used to maintain a complete separation between the front end and the core
Project.prototype.getSignature = function() {
    return this.signature;
};

// Return an array of array of Data objects listing every generator in the signature
Project.prototype.listGenerators = function() {
    return this.signature.getCells();
};

// Sets the front-end name of a generator to what the user wants
Project.prototype.setName = function(id, name) {
    var tempData = this.dataList.get(id);
    tempData.name = name;
    this.dataList.put(id, tempData);
    this.saveState();
};

// Gets the front-end name of a generator to what the user wants
Project.prototype.getName = function(id) {
    return this.dataList.get(id).name;
};

// Sets the front-end colour to what the user wants
Project.prototype.setColour = function(id, colour) {
    var tempData = this.dataList.get(id);
    tempData.colour = colour;
    this.dataList.put(id, tempData);
    this.saveState();
};

// Gets the front-end colour to what the user wants
Project.prototype.getColour = function(id) {
    return this.dataList.get(id).colour;
};

// Sets the front-end colour to what the user wants
Project.prototype.set_rate = function(id, rate) {
    var tempData = this.dataList.get(id);
    tempData.rate = rate;
    this.dataList.put(id, tempData);
    this.saveState();
};

// Gets the front-end colour to what the user wants
Project.prototype.get_rate = function(id) {
    return this.dataList.get(id).rate;
};


/* 
Takes a rule (generator) and a string describing how to get to an appropriate boundary of this diagram as arguments
Returns the list of all possible inclusion functions of the source of this generator into the diagram
*/
Project.prototype.matches = function(matched_diagram, boundary_path) {
    /* 
    If the degrees of this diagram and the matched diagram do not match, we boost the matched diagram so that they do
    This is a precondition for enumeration and matching
    */
    while (matched_diagram.dimension < this.diagram.dimension) {
        matched_diagram.boost();
    }

    var diagram_pointer = this.d;
    var matched_diagram_pointer = matched_diagram;
    /*
    Depending on the user selection, we find matches within an appropriate boundary of this diagram
    The default selection is the diagram itself, i.e. boundaryPath = []
    */
    for (var i = 0; i < boundary_path.length; i++) {
        if (boundary_path[i] === 's') {
            diagram_pointer = diagram_pointer.getSourceBoundary();
            matched_diagram_pointer = matched_diagram_pointer.getTargetBoundary();

        }
        else {
            diagram_pointer = diagram_pointer.getTargetBoundary();
            matched_diagram_pointer = matched_diagram_pointer.getSourceBoundary();

        }
    }
    return diagram_pointer.enumerate(matched_diagram_pointer);
};

/* 
Takes two arrays - an array of pre-computed matches between some matched diagram and this diagram, also an array of elements of this diagram
Only keeps the matches for which at least one value appears in the array of selected elements
*/
Project.prototype.limitMatches = function(matches, elements) {

    var validMatches = new Array();
    for (var i = 0; i < matches.length; i++) {
        var flag = false;
        matches[i].each(function(key, value) {
            for (var j = 0; j < elements.length; j++) {
                if (value === elements[j]) {
                    flag = true;
                }
            }
        }.bind(this));
        if (flag) {
            validMatches.push(matches[i]);
        }
    }
};

/*
    Takes a diagram that we want to attach, the path to the attachement boundary as arguments
    Updates this diagram to be the result of the attachment
*/
Project.prototype.attach = function(attachmentFlag, attached_diagram, bounds, boundary_path) {
    /*
    The attachment procedure could be rewritten so that the additional complexity arising from creating a copy of the source of the attached rewrite could be omitted
    This got created because of how the software was developed and because at the time when the attachment procedure was written it was not yet clear
    what will be the exact form of input provided by the front end.
    
    For now we leave it in the current form, as modifications to the attachment procedure would require modifying all the tests too
    */
    if (attachmentFlag) {
        this.diagram.attach(attached_diagram, boundary_path, bounds);
    }
    else {
        var rewrite_source_size = attached_diagram.getSourceBoundary().generators.length;

        var rewriteCell = {
            id: attached_diagram.generators[0].id,
            coordinate: bounds
        }

        this.diagram.rewrite(rewriteCell);

    }
};


// Clear the main diagram
Project.prototype.clearDiagram = function() {
    $('div.cell-b-sect').empty();
    this.diagram = null;
    this.renderDiagram();
    this.saveState();
}

// Take the identity on the main diagram
Project.prototype.takeIdentity = function() {
    if (this.diagram == null) return;
    if (this.diagram.getDimension() >= 3) {
        alert("Can't take the identity of a " + this.diagram.getDimension().toString() + "-dimensional diagram");
        return;
    }

    this.diagram.boost();
    this.renderDiagram();
}

/* 
    Depending on whether a source or a target have been already stored in memory, this procedure completes the rule with the diagram currently in workspace.
    If the dimensions match, an appropriate generator is added an an appropriate level (the second part handled internally by the Signature class).
    If none have been saved, it adds a 0-generator. For all these possible generators the internal name will be automatically added when the generator is created.
    Return true to indicate n-cells should be re-rendered.
*/

Project.prototype.saveSourceTarget = function(boundary /* = 'source' or 'target' */ ) {

    // If we haven't stored any source/target data yet, then just save this
    if (this.cacheSourceTarget == null) {
        this.cacheSourceTarget = {};
        this.cacheSourceTarget[boundary] = this.diagram;
        this.clearDiagram();
        return;
    }

    // Check whether we're replacing the cached source or target with a new one
    if (this.cacheSourceTarget[boundary] != null) {
        this.cacheSourceTarget[boundary] = this.diagram;
        this.clearDiagram();
        return;
    }

    // Store the source and target information
    this.cacheSourceTarget[boundary] = this.diagram;

    var source = this.cacheSourceTarget.source;
    var target = this.cacheSourceTarget.target;

    // Test dimensions
    if (source.getDimension() != target.getDimension()) {
        alert("Source and target must be the same dimension");
        this.cacheSourceTarget[boundary] = null;
        return true;
    }

    // Test globularity
    var sourceOfSource = source.getSourceBoundary();
    var sourceOfTarget = target.getSourceBoundary();
    var targetOfSource = source.getTargetBoundary();
    var targetOfTarget = target.getTargetBoundary();
    if (source.getDimension() != 0) { // globularity trivially satisfied for 0-diagrams
        if (!sourceOfSource.diagramBijection(sourceOfTarget)) {
            alert("Source of source does not match source of target");
            this.cacheSourceTarget[boundary] = null;
            return true;
        }
        if (!targetOfSource.diagramBijection(targetOfTarget)) {
            alert("Target of source does not match target of target");
            this.cacheSourceTarget[boundary] = null;
            return true;
        }
    }

    var generator = new Generator(source, target);
    var d = generator.getDimension();
    while (this.signature.n < d) {
        this.signature = new Signature(this.signature);
    }
    this.signature.addGenerator(generator);

    // Make the diagram for the generator
    var temp_diagram = this.signature.createDiagram(generator.identifier);
    var colour;
    var d = source.getDimension() + 1;
    if (d == 1) {
        colour = '#000000';
    }
    else {
        colour = '#000000';
    }
    var data = new Data(generator.identifier, colour, temp_diagram, temp_diagram.getDimension());
    this.dataList.put(generator.identifier, data);

    // Re-render and save the new state

    this.renderNCells(d);
    this.clearDiagram();

    this.cacheSourceTarget = null;
    this.saveState();
};

// Handle a click on a 2-cell to implement interchangers
Project.prototype.clickCell = function(height) {

    if (this.diagram.getDimension() != 2) return;

    // If this is the first click, just store it and exit
    if (this.selected_cell == null) {
        this.selected_cell = height;
        return;
    }

    // If we're reclicking the same thing, just exit
    if (this.selected_cell == height) {
        return;
    }

    var h1 = this.selected_cell;
    var h2 = height;
    /*
    // Try to perform the interchange
    var h1, h2;
    if (height < this.selected_cell) {
        h1 = height;
        h2 = this.selected_cell;
    }
    else {
        h1 = this.selected_cell;
        h2 = height;
    }
    */

    // Check if this is allowed
    if (!this.diagram.interchangerAllowed(h1, h2)) {
        var temp = h1;
        h1 = h2;
        h2 = temp;
    }

    if (!this.diagram.interchangerAllowed(h1, h2)) {
        alert("Cannot interchange these cells");
        return;
    }

    // Perform the interchanger
    this.diagram.rewriteInterchanger(h1, h2);

    // Finish up and render the result
    this.selected_cell = null;
    this.saveState();
    $('div.cell-b-sect').empty();
    this.renderDiagram();
}

Project.prototype.saveState = function() {
    //return;
    history.pushState({
        string: this.currentString()
    }, "", "");
}

// Makes this signature an empty signature of level (n+1)
Project.prototype.lift = function() {
    this.signature = new Signature(this.signature);
};

Project.prototype.selectGenerator = function(id) {

    var cell = this.dataList.get(id);

    // If current diagram is null, just display the generator
    if (this.diagram === null) {
        // Set this to be a pointer so that the rule gets modified accordingly
        // Equivalently we could set it to a copy
        this.diagram = cell.diagram.copy();
        this.renderDiagram();
        this.saveState();
        return null;
    }

    // If user clicked a 0-cell, do nothing
    if (cell.dimension == 0) {
        alert("0-cells can never be attached");
        return null;
    }

    var matched_diagram = cell.diagram.copy();

    if (matched_diagram.getDimension() > this.diagram.getDimension()) {
        // Don't bother attaching, just rewrite

        var rewrite_matches = this.diagram.enumerate(matched_diagram.getSourceBoundary());

        for (var i = 0; i < rewrite_matches.length; i++) {
            rewrite_matches[i] = {
                boundaryPath: "",
                inclusion: rewrite_matches[i],
                size: matched_diagram.getSourceBoundary().getFullDimensions()
            }
        }

        var enumerationData = {
            attachmentFlag: false,
            diagram: matched_diagram,
            matches: rewrite_matches
        };
        return enumerationData;
    }


    // Return all the ways to attach the selected cell
    var boundary_depth = this.diagram.getDimension() - cell.diagram.getDimension();

    var sourceMatches = this.prepareEnumerationData(matched_diagram, boundary_depth, 's');
    var targetMatches = this.prepareEnumerationData(matched_diagram, boundary_depth, 't');

    var enumerationData = {
        attachmentFlag: true,
        diagram: matched_diagram,
        matches: sourceMatches.concat(targetMatches)
    };
    return enumerationData;
}

Project.prototype.prepareEnumerationData = function(matched_diagram, boundary_depth, boundary_boolean) {

    var pattern_diagram;
    var matched_diagram_boundary;

    if (boundary_boolean === 's') {
        pattern_diagram = this.diagram.getSourceBoundary();
        for (var i = 0; i < boundary_depth; i++) {
            pattern_diagram = pattern_diagram.getSourceBoundary();
        }
        matched_diagram_boundary = matched_diagram.getTargetBoundary();
    }
    else {
        pattern_diagram = this.diagram.getTargetBoundary();
        for (var i = 0; i < boundary_depth; i++) {
            pattern_diagram = pattern_diagram.getTargetBoundary();
        }
        matched_diagram_boundary = matched_diagram.getSourceBoundary();
    }


    var matched_size = matched_diagram_boundary.getFullDimensions();

    var matches = pattern_diagram.enumerate(matched_diagram_boundary);
    for (var i = 0; i < matches.length; i++) {
        matches[i] = {
            boundaryPath: (boundary_depth < 0 ? "" : Array(boundary_depth + 2).join(boundary_boolean)),
            inclusion: matches[i],
            size: matched_size
        };
    }
    return matches;
};


// Returns the current string 
Project.prototype.currentString = function() {
    return globular_stringify(this);
}

// Returns the current string 
Project.prototype.addZeroCell = function() {
    var generator = new Generator(null, null);
    var varSig = this.signature;
    while (varSig.sigma != null) {
        varSig = varSig.sigma;
    }
    varSig.addGenerator(generator);
    var temp_diagram = this.signature.createDiagram(generator.identifier);
    var data = new Data(generator.identifier, '#00b8ff', temp_diagram, temp_diagram.getDimension());
    this.dataList.put(generator.identifier, data);
}

Project.prototype.render = function(div, diagram, highlight) {
    /*
        if (highlight === undefined) {
            highlight = {
                inclusion: {
                    bounds: []
                },
                boundaryPath: ""
            };
        }

        // Update the highlight data to refer to top-level names
        var boundary_array = highlight.boundaryPath.split();
        var bounds = [];
        for (var i = 0; i < highlight.inclusion.bounds.length; i++) {
            bounds[i] = {};
            bounds[i].preceding = map_diagram.elementGeneralName(highlight.inclusion.bounds[i].preceding, boundary_array);
            bounds[i].succeeding = map_diagram.elementGeneralName(highlight.inclusion.bounds[i].succeeding, boundary_array);
        }

        // Make an array of colour data.
        // In the future, only do this for colours we actually need,
        // or find some other way to do this - it's a bit ugly.
        var tempColours = new Hashtable();
        map_diagram.map.each(function(key, value) {
            tempColours.put(key, this.dataList.get(value).colour);
        }.bind(this));
        map_diagram.render(div, tempColours, {boundaryPath: highlight.boundaryPath, bounds: bounds, bubble_bounds: highlight.inclusion.bubble_bounds});
    */

    diagram.render(div, highlight);

}

// Render a generator
Project.prototype.renderGenerator = function(div, id) {
    this.render(div, this.dataList.get(id).diagram);
}

// Render the main diagram
Project.prototype.renderDiagram = function() {
    var div = '#diagram-canvas';
    if (this.diagram == null) {
        $('#slider').hide()
        var canvas = $(div).find('canvas');
        if (canvas.length != 0) {
            canvas = canvas[0];
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    else {
        if (this.diagram.dimension === 3) {
            $('#slider').attr('max', this.diagram.generators.length);
            $('#slider').show()
            var slider = $('#slider').val();
            var diagram = this.diagram.getSlice(slider);
            this.render(div, diagram);
        }
        else {
            $('#slider').hide()
            this.render(div, this.diagram);
        }
    }

};

// Need to write this code
Project.prototype.renderHighlighted = function() {
    return null;
}

Project.prototype.createGeneratorDOMEntry = function(n, cell) {
    var ccps_opt_str = "";

    var cell_name = this.getName(cell);

    // Create cell body
    var div_main = document.createElement('div');
    div_main.className = 'cell-opt';
    div_main.id = 'cell-opt-' + cell;
    div_main.c_type = n;

    // Add icon
    var div_icon = document.createElement('div');
    div_icon.className = 'cell-icon';
    div_icon.id = 'ci-' + cell;
    div_main.appendChild(div_icon);

    // Add second icon if necessary
    if (n == 3) {
        var span_arrow = document.createElement('div');
        span_arrow.innerHTML = '&rarr;';
        span_arrow.className = 'target-rule-arrow';
        div_main.appendChild(span_arrow);

        var div_icon_2 = document.createElement('div');
        div_icon_2.className = 'cell-icon';
        div_icon_2.id = 'ci1-' + cell;
        div_main.appendChild(div_icon_2);
        $(div_icon_2).css('margin-left', '22px');
    }

    // Add detail container
    var div_detail = document.createElement('div');
    $(div_detail).css('width', '100px');
    div_detail.className = 'cell-detail';
    div_main.appendChild(div_detail);
    if (n == 3) {
        $(div_detail).css('margin-left', '155px');
    }

    // Add label
    var div_name = document.createElement('input');
    div_name.type = 'text';
    div_name.className = 'cell-label';
    div_name.id = 'cl-' + cell;
    div_name.value = cell_name;
    div_detail.appendChild(div_name);

    // Add color picker
    var project = this;
    var input_color = document.createElement('input');
    input_color.className = 'color-picker';
    input_color.value = this.getColour(cell);
    var color_widget = new jscolor.color(input_color);
    color_widget.pickerClosable = true;
    color_widget.fromString(this.getColour(cell));
    color_widget.onImmediateChange = function() {
        project.setColour(cell, '#' + this.toString());
        project.renderAll();
    };


    /*$(input_color).blur(function() {
        project.setColour(cell, '#' + $(this).val().toString());
        project.renderAll();
    });*/

    div_detail.appendChild(input_color);

    if (n != 0) {

        var sto_rate_text = document.createElement('input');
        sto_rate_text.className = 'stochastic-rate';
        sto_rate_text.id = 'sr-' + cell;
        sto_rate_text.type = 'text';
        sto_rate_text.placeholder = 'Rate';

        div_detail.appendChild(sto_rate_text);

    }

    $("#stochastic-cb").change(function() {
        if ($(this).is(':checked')) {
            $(".stochastic-rate").slideDown();

        }
        else {
            $(".stochastic-rate").slideUp();
        }
    });

    $(sto_rate_text).blur(function() {
        var cid = $(this).attr("id").substring(3);
        alert(cid);
        var rate = $(this).val();
        project.set_rate(cell, rate);
    });

    // Add extra section
    var div_extra = document.createElement('div');
    div_extra.className = 'cell-b-sect';
    //div_extra.id = 'cell-b-sect-' + cell;
    div_main.appendChild(div_extra);

    // Add to body and animate
    $(div_name).blur(function() {
        project.setName(cell, cell_name);
    });

    (function(project) {
        $(div_icon).click(function() {

            var cid = $(this).attr("id").substring(3);

            var enumerationData = project.selectGenerator(cid);
            if (enumerationData == null) return;
            var match_array = enumerationData.matches;

            // Display a list of all the attachment possibilities
            $('div.cell-b-sect').empty();
            for (var i = 0; i < match_array.length; i++) {
                var div_match = document.createElement('div');
                $(div_match)
                    .css('width', 65)
                    .css('height', 65)
                    .css('float', 'left')
                    .css('margin', 3);
                //div_match.appendChild(document.createTextNode(" " + i.toString() + " "));

                if (project.diagram.dimension === 3) {
                    project.render(div_match, project.diagram.getSourceBoundary(), match_array[i]);
                }
                else {
                    project.render(div_match, project.diagram, match_array[i]);
                }
                (function(match) {
                    $(div_match).click(function() {
                        project.attach(
                            enumerationData.attachmentFlag,
                            enumerationData.diagram, // the diagram we are attaching
                            match.inclusion, // the inclusion data for the boundary
                            match.boundaryPath);
                        $('div.cell-b-sect').empty();
                        project.renderAll();
                        project.saveState();
                    });
                })(match_array[i]);

                (function(match) {
                    $(div_match).hover(
                        /* HOVER OVER THE PREVIEW THUMBNAIL */
                        function() {
                            if (project.diagram.dimension === 3) {
                                project.render('#diagram-canvas', project.diagram.getSourceBoundary(), match);
                            }
                            else {
                                project.render('#diagram-canvas', project.diagram, match);
                            }
                        },
                        /* MOUSE OUT OF THE PREVIEW THUMBNAIL */
                        function() {
                            project.renderDiagram();
                        }
                    )
                })(match_array[i]);
                $(div_extra).append(div_match);
            }
        });
    })(this);



    return div_main;
}

// Render n-cells and main diagram
Project.prototype.renderAll = function() {
    this.renderCells();
    this.renderDiagram();
}

// Render all n-cells
Project.prototype.renderCells = function() {
    var n = this.listGenerators().length;
    for (var i = 0; i <= n; i++) {
        this.renderNCells(i);
    }
}

// Render the n-cells
Project.prototype.renderNCells = function(n) {
    var replace;
    if ($("#cell-group-" + n.toString())[0]) {
        replace = true;
    }
    else {
        replace = false;
    }
    if (replace == false) {
        var cell_group_html;
        if (n == 0) {
            cell_group_html = "<div class = 'mini-opt-links'><span id = 'add-0-cell-opt'>New 0-cell</span></div>";
        }
        else {
            cell_group_html = "";
        }
        var cell_group_html = cell_group_html + "<div class = 'cell-group' id = 'cell-group-" + n + "'>" + n + "-Cells</div>";
        $("#cell-body").append($(cell_group_html));
    }
    var cells = this.listGenerators()[n]; //["testCell1", "testCell2", "TESTcell3"];
    if (cells == undefined) cells = [];
    $("#cell-group-" + n.toString()).html(n + "-Cells");

    for (var i = 0; i < cells.length; i++) {

        var cell = cells[i];

        // Construct the new generator
        var entry = this.createGeneratorDOMEntry(n, cell);

        // Add it to the list
        $("#cell-group-" + n.toString()).append(entry);

        // Render the picture of the generator
        if (n == 3) {

            // Render the source diagram into $("#ci-" + cell)
            var tempColours = new Hashtable();
            this.dataList.each(function(key, value) {
                tempColours.put(key, value.colour)
            });
            var overallMapDiag = this.dataList.get(cell).diagram;
            // Source
            var sourceMapDiag = overallMapDiag.getSourceBoundary();
            this.render("#ci-" + cell, sourceMapDiag);

            // Target
            var targetMapDiag = overallMapDiag.getTargetBoundary();
            this.render("#ci1-" + cell, targetMapDiag);

        }
        else {
            this.renderGenerator("#ci-" + cell, cell);
        }
    }

}
