// TinyModel {{{1
TinyModel = function() {
  // Private {{{2
  var setProps = function(model, props) {
    for (var index in props) {
      model.prototype.__properties__.push(new TinyModel.Property({
        name : props[index][0],
        type : props[index][1]
      }));
    }
  };

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

        m.buildOpts();
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

  // Public {{{2
  return {
    dataStore : null,

    register : function(className, opts) {
      var model = eval(className + " = function(opts){this.__opts__=opts||[]}");

      model.__adapter__ = TinyModel.dataStore;
      model.__adapter__.createTable(className);
        
      model.all = function(opts) {
        return modelize.call(this,
          this.__adapter__.execute({
            command : 'all',
            table : className,
            attributes : (opts || [])
          })
        );
      };
      model.first = function(opts) {
        return modelize.call(this,
          this.__adapter__.execute({
            command : 'first',
            table : className,
            attributes : (opts || [])
          })
        );
      };
      model.build  = function(opts) { var m = new this(opts); m.buildOpts(); return m };
      model.create = function(opts) { var m = this.build(opts); m.save(); return m };

      model.prototype = {
        constructor : model,

        tableName : className,

        __properties__ : [],

        buildOpts : function() {
          for (var o in this.__opts__)
            this.attributes[o] = this.__opts__[o];
        },

        __isNewRecord__ : true,

        isNew : function() { return this.__isNewRecord__ },

        toString : function() {
          var str = "#<" + className + " ";
          for (var prop in this.__properties__) {
            var name = this.__properties__[prop].name;
            str += "@" + name + ":" + this.attributes[name] + " ";
          }
          str += ">";

          return str;
        },

        save : function() {
          model.__adapter__.execute({
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
          model.__adapter__.execute({
            command : 'destroy',
            table : this.tableName,
            attributes : this.attributes
          });
        },

        adapter : function() {return model.__adapter__},

        attributes : {}
      }

      setProps(model, opts.properties);

      return model;
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

TinyModel.register("TestModel", {
  properties : [
    ['id', Number],
    ['name', String],
    ['age', Number]
  ]
});

/* vim: set ts=2 bs=2 sw=2 et fdm=marker: */
