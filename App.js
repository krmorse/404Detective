Ext.define('CustomApp', {
  extend: 'Rally.app.App',
  componentCls: 'app',

  padding: 20,

  layout: {
    type: 'vbox',
    align: 'stretch'
  },

  items: [
    {
      xtype: 'container',
      itemId: 'header',
      layout: 'hbox',
      height: 40
    },
    {
      xtype: 'container',
      itemId: 'results',
      flex: 1
    }
  ],

  launch: function () {
    this.down('#header').add([
      {
        xtype: 'rallytextfield',
        itemId: 'id',
        fieldLabel: 'Url or Id:',
        labelWidth: 50,
        width: 500
      },
      {
        xtype: 'rallybutton',
        text: 'Go!',
        margin: '0 0 0 10px',
        listeners: {
          click: this._onGoClicked,
          scope: this
        }
      }
    ]);

    //https://rally1.rallydev.com/#/109040305124d/detail/userstory/183264007752
    //Write app code here

    //API Docs: https://help.rallydev.com/apps/2.1/doc/
  },

  _onGoClicked: function() {
    this.down('#results').removeAll();
    this.setLoading(true);
    var value = this.down('#id').getValue();
    if (value) {
      var oid = parseInt(value);
      if (isNaN(oid)) {
        oid = Rally.util.Ref.getOidFromRef(value);
      }
      
      if (oid) {
        Ext.create('Rally.data.lookback.SnapshotStore', {
          context: this.getContext().getDataContext(),
          fetch: ['FormattedID', 'Name', '_User', '_SnapshotType'],
          sorters: [
            {
              property: '_ValidFrom',
              direction: 'DESC'
            }
          ],
          filters: [
            {
                property: 'ObjectID',
                operator: '=',
                value: oid
            }
          ]
        }).load().then({
          success: this._onSnapshotsLoaded, 
          scope: this
        });
      }
    }
  },

  _onSnapshotsLoaded: function(records) {
    var lastSnapshot = records[0];
    if (lastSnapshot) {
      var type = lastSnapshot.raw._SnapshotType;
      if (type === 'DELETE') {
        var formattedID = lastSnapshot.raw.FormattedID,
          name = lastSnapshot.raw.Name,
          deletedBy = lastSnapshot.raw._User,
          deletedAt = lastSnapshot.raw._ValidTo;
          this._loadUser(deletedBy).then({
            success: function(user) {
              this.setLoading(false);
              this._showResult(formattedID + ': ' + name + ' was deleted by ' +
              user.get('_refObjectName') + ' at ' + deletedAt + '.');
            },
            scope: this
          });
      } else {
        this.setLoading(false);
        this._showResult('The referenced object does not appear to be in the recycle bin.');
      }
    } else {
      this.setLoading(false);
      this._showResult('Unable to find an object with that id.');
    }
  },

  _loadUser: function(oid) {
    return Rally.data.wsapi.ModelFactory.getModel({ type: 'User'}).then({
      success: function(userModel) {
        return userModel.load(oid);
      },
      scope: this
    });
  },

  _showResult: function(message) {
    this.down('#results').add({
      xtype: 'component',
      html: message
    });
  }
});
