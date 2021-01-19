const parse = require("node-html-parser").parse;
const fs = require("fs");

const content = String(fs.readFileSync(process.argv[2]))
const root = parse(content);
const code = root.childNodes;

const parseArgs = tag => {
    return tag.rawAttrs.trim().split(" ").map(attr => {
        return [attr.split("=")[0], attr.split("=")[1].substring(1, attr.split("=")[1].length - 1)]
    })
};

const findArg = (args, name) => {
    return args.find(x => x[0] === name)[1]
};

const handleVariable = (state, tag) => {
    const valueTxt = tag.childNodes[0].rawText;
    const type = tag.classNames[0];
    
    state.variables[tag.id] = 
        type === "number" ? Number(valueTxt) :
        type === "string" ? valueTxt         :
        type === "bool"   ? (valueTxt === "false" ? false : true ) :
        type === "var"    ? state.variables[valueTxt]
        : undefined;
};

const handleFunctionCall = (state, tag) => {
    const args = parseArgs(tag);

    const func = findArg(args, 'src');

    const funcArgs = findArg(args, 'alt').split(",").map(x => x.trim());
    
    state.variables[func](...funcArgs)
};

const handleWhile = (state, tag) => {
    const varName = tag.id;
    let notStopping = true;
    while(state.variables[tag.id] && notStopping) {
        notStopping = interpret(tag.childNodes);
    }
};

const handleConstruct = (state, tag) => {
    const type = tag.classNames[0];

    switch(type) {
        case "while":
            handleWhile(state, tag);
    }
};

const state = {
    variables: {
        print: str => process.stdout.write(String(state.variables[str]).replace(/\\n/g, '\n')),
        '+': (a, b) => state.variables[a] = state.variables[a] + state.variables[b],
        '-': (a, b) => state.variables[a] = state.variables[a] - state.variables[b],
        '*': (a, b) => state.variables[a] = state.variables[a] * state.variables[b],
        '/': (a, b) => state.variables[a] = state.variables[a] / state.variables[b],
        '%': (a, b) => state.variables[a] = state.variables[a] % state.variables[b],
        '**': (a, b) => state.variables[a] = state.variables[a] ** state.variables[b],
        'greater': (a, b) => state.variables[a] = state.variables[a] > state.variables[b],
        'smaller': (a, b) => state.variables[a] = state.variables[a] < state.variables[b],
        'is': (a, b) => state.variables[a] = state.variables[a] === state.variables[b],
        'isnt': (a, b) => state.variables[a] = state.variables[a] !== state.variables[b]
    }
};

const interpret = code => {
    let run = true
    code.forEach(el => {
        if (run) {
            const tag = el.rawTagName;
            
            if (tag) {
                switch(tag) {
                    case "var":
                        handleVariable(state, el);
                        break;

                    case "img":
                        handleFunctionCall(state, el);
                        break;

                    case "span":
                        handleConstruct(state, el);
                        break;
                    
                    case "br":
                        run = false
                        break;
                }
            }
        }
    });

    return run;
};

interpret(code);

module.exports = {
    interpret
};