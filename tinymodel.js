// TinyModel {{{1
TinyModel = function() {
  // Private {{{2

  var modelize = function(data) {
    if (data instanceof Array) {
      var ret = [];
      for (var o in data) {
        var m = new this;
        var props = this.__properties__;

        for (var i in props) {
          var name = props[i].name;
          m.__opts__.push(data[o].name);
        }

        buildOpts(m);
        m.__isNewRecord__ = false;
        ret.push(m);
      }
    } else if (data instanceof Object) {
      var ret = new this;
      var props = this.__properties__;

      for (var i in props) {
        var name = props[i].name;
        ret.__opts__[name] = data[name];
      }
      buildOpts(ret);
      ret.__isNewRecord__ = false;
    }

    return ret;
  };

  var buildOpts = function(model) {
    for (var o in model.__opts__)
      for (var i=0 ; i<=model.constructor.__properties__.length ; ++i)
        if (o === model.constructor.__properties__[i].name) {
          model.attributes[o] = model.__opts__[o];
          model[o] = model.__opts__[o]/*function(val){
            if (!val) return model.__opts__[o];
            model.originalAttributes[o] = model.attributes[o];
            model.attributes[o] = val;
          }*/
          break;
        }
  };

  // Public {{{2
  return {
    adapter : null,

    register : function(name, classOpts) {
      var model = function(opts){this.__opts__ = opts || {}};
      this.Resource.apply(model, [name]);
      if (classOpts instanceof Function) classOpts.apply(model);

      return model;
    },

    Resource : function(tableName) {
      // Class Methods {{{3
      var self = this;

      this.__adapter__ = TinyModel.adapter;
      this.__properties__ = [new TinyModel.Property({name:'__DSID__', type:Number})];
      this.migrate = function() {this.__adapter__.createTable(tableName)};
      this.property = function(name, type, opts) {
        var prop = new TinyModel.Property({
          name : name,
          type : type
        });

        this.__properties__.push(prop);
        return prop;
      };
      this.all = function(opts) {
        return modelize.call(this,
          this.__adapter__.execute({
            command : 'all',
            table : tableName,
            attributes : (opts || [])
          })
        );
      };
      this.first = function(opts) {
        return modelize.call(this,
          this.__adapter__.execute({
            command : 'first',
            table : tableName,
            attributes : (opts || [])
          })
        );
      };
      this.build  = function(opts) {
        var m = new this(opts);
        buildOpts(m);
        m.__isNewRecord__ = true;
        return m;
      };
      this.create = function(opts) { var m = this.build(opts); m.save(); return m };

      // Instance Methods {{{3
      this.prototype = {
        constructor : self,
        tableName : tableName,
        isDirty : function() {
          for (var o in this.originalAttributes)
            if (this.attributes[o] !== this.originalAttributes[o])
              return true;

          return false;
        },
        isNew : function() { return this.__isNewRecord__ },
        toString : function() {
          var props = this.constructor.__properties__.slice();
          var str = ["#<", tableName, " "];

          for (var i=0 ; i<props.length ; ++i) {
            var name = props[i].name;
            if (name != "__DSID__")
              str = str.concat(["@", name, ":", this.attributes[name], " "]);
          }
          str.push(">");
          return str.join('');
        },
        isValid : function() {return true},
        save : function() {
          if (!this.isDirty() && !this.isNew()) return true;
          if (!this.isValid()) return false;

          var cmd = this.isNew() ? 'create' : 'update';

          this.constructor.__adapter__.execute({
            command : cmd,
            table : this.tableName,
            attributes : this.attributes
          });

          return true;
        },
        update : function(obj) {
          for (var o in obj) {
            this.originalAttributes[o] = this.attributes[o];
            this.attributes[o] = obj[o];
          }

          if (this.save())
            return this;
          else
            return false;
        },
        destroy : function() {
          this.constructor.__adapter__.execute({
            command : 'destroy',
            table : this.tableName,
            attributes : this.attributes
          });
        },
        attributes : {},
        originalAttributes :{}
      }

      return this;
    }
  }
  // }}}2
}();

// TinyModel.Property {{{1
TinyModel.Property = function(opts) {
  this.name = opts.name;
  this.type = opts.type;
}

TinyModel.Property.prototype.toString = function() {
  return "#<Property @"+this.name+":"+this.type+">";
}

// TinyModel.DataStore {{{1
TinyModel.DataStore = function() {
  // Private {{{2
  var db = {};

  // Table {{{3
  var Table = function() {
    var dsid = 0;
    var store = [];

    var find = function(finder) {
      for (var index=0 ; index<store.length ; ++index)
        if (finder.call(store[index])) return [store[index], index];
    };

    this.create = function(thing) {
      ++dsid;
      thing.__DSID__ = dsid;
      store.push(thing)
    };
    this.update = function(thing) {
      var record = find(function() {
        this.__DSID__ === thing.__DSID__;
      });

      if (record) store[record[1]] = thing;
    };
    this.get = function(id) {
      var record = find(function() { this.id === id });
      if (record) return record[0];
    };
    this.destroy = function(thing) {
      var record = find(function() {this.__DSID__ === thing.__DSID__});
      if (record) store.splice(record[1], 1);
    };

    this.all = function(opts) {
      var rets = store.slice();
      for (var index in rets) {
        var doRet = true;
        for (var key in opts)
          if (rets[index][key] !== opts[key]) doRet = false;

        if (!doRet) rets.splice(index,0,'');
      }

      return rets;
    };

    this.first = function(opts) {
      for (var index=0; index<store.length; ++index)
        for (var key in opts)
          if (store[index][key] === opts[key]) return store[index];

      return store[0];
    };
  };

  // Public {{{2
  return {
    execute : function(o) { return db[o.table][o.command](o.attributes); },
    createTable : function(name) { db[name] = new Table },
  };
}();

// TinyModel Defaults {{{1
TinyModel.adapter = TinyModel.DataStore;
// }}}

TestModel = TinyModel.register('test_model', function() {
  this.property("name", String);
  this.property("age", Number);
});
TestModel.migrate();

/* vim: set ts=2 bs=2 sw=2 et fdm=marker: */
