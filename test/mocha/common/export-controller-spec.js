/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const exportsSpec =
  {
    "perRun": ["perRunParam", "perRunOutput"],
    "perTick": ["perTickOutput", "perTickParam"]
  };

helpers.withIsolatedRequireJS(function(requirejs) {

  let canExportData = false;

  const codapInterface = {
    exportData: sinon.spy(),
    logAction: sinon.spy(),
    canExportData() { return canExportData; },
    init() {}
  };

  requirejs.define('import-export/codap-interface', [], () => codapInterface);

  const Model            = requirejs('models/md2d/models/modeler');
  const ExportController = requirejs('common/controllers/export-controller');

  class MockInteractivesController {
    static initClass() {
  
      this.prototype.logAction = sinon.spy();
    }
    constructor() {
      this.modelResetCallbacks = [];
      this.modelLoadedCallbacks = [];
    }

    on(event, callback) {
      if (event.indexOf('modelReset') === 0) { this.modelResetCallbacks.push(callback); }
      if (event.indexOf('modelLoaded') === 0) { return this.modelLoadedCallbacks.push(callback); }
    }

    loadModel() {
      this.model = loadModel();
      return this.modelLoadedCallbacks.forEach(cb => cb('initialLoad'));
    }

    getModel() {
      return this.model;
    }

    get() {
      return 100;
    }

    reloadModel(opts) {
      if (!opts) { opts = { cause: 'reload' }; }
      this.model.willReset();
      this.model = loadModel();
      return this.modelLoadedCallbacks.forEach(cb => cb(opts.cause));
    }
  }
  MockInteractivesController.initClass();

  var loadModel = function() {
    const model = new Model({});

    model.defineOutput('perRunOutput', {
      label: "per-run output",
      unitAbbreviation: "units 1"
    }, () => 1 + model.get('time'));

    model.defineOutput('perTickOutput', {
      label: "per-tick output",
      unitAbbreviation: "units 2"
    }, () => 2 + model.get('time'));

    model.defineParameter('perRunParam', {
      label: "per-run parameter",
      unitAbbreviation: "units 3"
    }, () => null);

    model.defineParameter('perTickParam', {
      label: "per-tick parameter",
      unitAbbreviation: "units 4"
    }, () => null);

    model.set({
      timeStep: 1000,
      timeStepsPerTick: 1,
      perRunParam: 10,
      perTickParam: 20
    });

    return model;
  };


  describe("Export controller events", () => it("should emit canExportData if codapInterface connects to CODAP after initialization", function() {
    const canExportDataHandler = sinon.spy();

    // the value to be returned by codapInterface.canExportData():
    canExportData = false;
    const interactivesController = new MockInteractivesController();
    const exportController = new ExportController(interactivesController);
    exportController.init(exportsSpec);
    exportController.on('canExportData', canExportDataHandler);

    // now, test it
    canExportData = true;
    codapInterface.codapDidConnect();

    return canExportDataHandler.called.should.equal(true);
  }));


  return describe("Export controller", function() {
    let exportController = null;
    let interactivesController = null;
    let model = null;

    beforeEach(function() {
      codapInterface.exportData.reset();
      interactivesController = new MockInteractivesController();
      exportController = new ExportController(interactivesController);
      exportController.init(exportsSpec);

      interactivesController.loadModel();
      return model = interactivesController.model;
    });


    describe("when exportData is called", function() {
      let call = null;
      beforeEach(() => exportController.exportData());

      it("should call codapInterface.exportData()", () => codapInterface.exportData.callCount.should.equal(1));

      return describe("arguments to codapInterface.exportData()", function() {
        call = null;
        beforeEach(() => call = codapInterface.exportData.getCall(0));

        describe("the first argument", () => it("should be a list of the per-run parameters followed by the per-run outputs, including labels and units", () => call.args[0].should.eql([{name: "per-run parameter", unit: "units 3"}, {name: "per-run output", unit: "units 1"}])));

        describe("the second argument", () => it("should be a list of per-run parameters and outputs' values", () => call.args[1].should.eql([10, 1])));

        describe("the third argument", () => it("should be a list containing \"Time (ps)\", followed by per-tick parameters and outputs, including labels and units", () => call.args[2].should.eql([{name: "Time", unit: "ps"}, {name: "per-tick output", unit: "units 2"}, {name: "per-tick parameter", unit:"units 4"}])));

        describe("the fourth argument", () => it("should be a list of lists containing the model time, plus the per-tick values", () => call.args[3].should.eql([[0, 2, 20]])));

        return describe("after exportData is called a second time", () => beforeEach(function() {
          exportController.exportData();
          return call = codapInterface.exportData.getCall(1);
        }));
      });
    });

    describe("effect of stepping model forward/back/etc", function() {

      const exportedTimePoints = function() {
        exportController.exportData();
        const call = codapInterface.exportData.getCall(0);
        const args = call.args[3];
        return args.map(dataPoint => dataPoint[0]);
      };

      describe("a model tick", () => it("should result in a data point being added to the timeseries data", function() {
        model.tick();
        const points = exportedTimePoints();
        return points.should.eql([0, 1]);
    }));

      describe("a model reset", () => it("should reset the timeseries data to one data point", function() {
        model.tick();
        model.reset();
        return exportedTimePoints().should.eql([0]);
    }));

      describe("a step back", () => it("should not remove data points from the timeseries data", function() {
        model.tick();
        model.stepBack();
        const points = exportedTimePoints();
        return points.should.eql([0, 1]);
    }));

      return describe("a step back followed by an invalidating change", () => it("should remove a data point from the timeseries data", function() {
        model.tick();
        model.stepBack();
        model.set({gravitationalField: 0});
        const points = exportedTimePoints();
        return points.should.eql([0]);
    }));
  });

    return describe("event logging", function() {

      const objectAttachedTo = call => call.args[1];

      beforeEach(() => interactivesController.logAction.reset());

      describe("after a model reload with cause 'new-run'", function() {
        beforeEach(() => interactivesController.reloadModel({ cause: 'new-run' }));

        return it("should log \"SetUpNewRun\"", function() {
          interactivesController.logAction.callCount.should.eql(1);
          const call = interactivesController.logAction.getCall(0);
          return call.args[0].should.match(/^SetUpNewRun/);
        });
      });

      describe("after exportData is called", function() {
        beforeEach(() => exportController.exportData());

        it("should log \"ExportedModel\"", function() {
          interactivesController.logAction.callCount.should.eql(1);
          const call = interactivesController.logAction.getCall(0);
          return call.args[0].should.match(/^ExportedModel/);
        });

        return it("should pass the per-run parameters", function() {
          const call = interactivesController.logAction.getCall(0);
          return objectAttachedTo(call).should.eql({
            "per-run parameter (units 3)": 10,
            "per-run output (units 1)": 1
          });
        });
      });

      describe("after the model is run and a parameter is changed, and exportData is called again", function() {
        let calls = null;
        const getLogCallsMatching = function(pattern) {
          let changedParametersLogs;
          return changedParametersLogs = ((() => {
            const result = [];
            for (let call of calls) {               if (call.args[0].match(pattern)) {
                result.push(call);
              }
            }
            return result;
          })());
        };

        beforeEach(function() {
          model.start();
          model.stop();
          model.properties.perRunParam = 11;
          exportController.exportData();
          return calls = (__range__(0, interactivesController.logAction.callCount, false).map((i) => interactivesController.logAction.getCall(i)));
        });

        it("should log \"ParameterChange\"", () => getLogCallsMatching(/^ParameterChange/)
          .should.have.lengthOf(1));

        return describe("the \"User changed parameters between start and export\" log event", () => it("should list the changed parameters", function() {
          const call = getLogCallsMatching(/^ParameterChange/)[0];
          return objectAttachedTo(call).should.eql({
            "per-run parameter (units 3) changed?"        : true,
            "per-run parameter (units 3) (start of run)"  : 10,
            "per-run parameter (units 3) (sent to CODAP)" : 11,
            "per-run output (units 1) changed?"           : false,
            "per-run output (units 1) (start of run)"     : 1,
            "per-run output (units 1) (sent to CODAP)"    : 1
          });
        }));
      });

      return describe("when the per-tick parameter is updated before the run starts", function() {
        beforeEach(function() {
          model.properties.perTickParam = 123;
          model.start();
          return model.stop();
        });

        return it("should be reflected in the timeseries data", function() {
          exportController.exportData();
          const call = codapInterface.exportData.getCall(0);
          const args = call.args[3];
          return args.should.eql([[0, 2, 123]]);
      });
    });
  });
});});

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}