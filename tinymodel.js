// TinyModel {{{1
TinyModel = function() {
  // Private {{{2

  var modelize = function(data) {
    if (data instanceof Array) {
      var ret = [];
      for (var o in data) {
        var m = new this;
        var props = this.prototype.__properties__;

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
      var props = this.prototype.__properties__;

      for (var i in props) {
        var name = props[i].name;
        ret.__opts__.push(data[name]);
        ret.__isNewRecord__ = false;
      }
    }

    return ret;
  };

  var buildOpts = function(model) {
    for (var o in model.__opts__)
      for (var i=0 ; i<=model.constructor.__properties__.length ; ++i)
        if (o === model.constructor.__properties__[i].name) {
          model.attributes[o] = model.__opts__[o];
          break;
        }
  };

  // Public {{{2
  return {
    dataStore : null,

    register : function(name, classOpts) {
      var model = new Function('opts', 'this.__opts__ = opts');
      this.Resource.apply(model, [name]);
      if (classOpts instanceof Function) classOpts.apply(model);

      return model;
    },

    Resource : function(tableName) {
      // Class Methods {{{3

      var self = this;
      this.__adapter__ = TinyModel.dataStore;
      this.__properties__ = [];
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
      this.build  = function(opts) { var m = new this(opts); buildOpts(m); return m };
      this.create = function(opts) { var m = this.build(opts); m.save(); return m };

      // Instance Methods {{{3
      this.prototype = {
        constructor : self,
        tableName : tableName,
        __properties__ : [],
        __isNewRecord__ : true,
        isNew : function() { return this.__isNewRecord__ },
        toString : function() {
          var props = this.constructor.__properties__;
          var str = ["#<", tableName, " "];

          for (var i=0 ; i<props.length ; ++i) {
            var name = props[i].name;
            str = str.concat(["@", name, ":", this.attributes[name], " "]);
          }
          str.push(">");
          return str.join('');
        },
        save : function() {
          this.constructor.__adapter__.execute({
            command : 'save',
            table : this.tableName,
            attributes : this.attributes
          });

          return true;
        },
        update  : function(obj) {
          this.attributes = obj;

          if (this.save)
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
        adapter : function() {return this.constructor.__adapter__},
        attributes : {}
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
    var store = [];
    var retrieveBy = function(param, val) {
      for (var index in store)
        if (store[index].param === val) return store[index];
    };

    this.save = function(thing) {store.push(thing)};
    this.get = function(id) {retrieveBy('id', id)};
    this.destroy = function(thing) {
      for (var index in store)
        if (store[index] == thing) store.splice(index, 1);
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
      for (var index in store)
        for (var key in opts)
          if (store[index][key] === opts[key]) return store[index];

      return store[0];
    };
  };

  // Public {{{2
  return {
    execute : function(o) { return db[o.table][o.command](o.attributes); },
    createTable : function(name) { db[name] = new Table },
  }
}

// TinyModel Defaults {{{1
TinyModel.dataStore = new TinyModel.DataStore;
// }}}

TestModel = TinyModel.register('test_model', function() {
  this.property("id", Number);
  this.property("name", String);
  this.property("age", Number);
});
TestModel.migrate();

/* vim: set ts=2 bs=2 sw=2 et fdm=marker: */
