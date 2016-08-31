var Gab = {
    connection: null,
    jid_selected: null,
    
    /*
     * used to convert the xml to html 
     */
    jid_to_id: function (jid) {
        return Strophe.getBareJidFromJid(jid)
            .replace(/@/g, "-")
            .replace(/\./g, "-");
    },

    /*
     * called when a roster is adding to the roster-list
     */
    on_roster: function (iq) {
        $(iq).find('item').each(function () {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;

            // transform jid into an id
            var jid_id = Gab.jid_to_id(jid);

            var contact = $("<li id='" + jid_id + "'>" +
                    		"<div class='roster-contact offline'>" +
                    		"<div class='roster-name'>" +
                    		name +
                    		"</div><div class='roster-jid hidden'>" +
                    		jid +
                    		"</div></div></li>");
            
            Gab.insert_contact(contact);
        });

        // set up presence handler and send initial presence
        Gab.connection.addHandler(Gab.on_presence, null, "presence");
        Gab.connection.send($pres());
    },

    pending_subscriber: null,

    /*
     * used to determine the availability of any user
     */
    on_presence: function (presence) {    	
        var ptype = $(presence).attr('type');
        var from = $(presence).attr('from');
        var jid_id = Gab.jid_to_id(from);

        if (ptype === 'subscribe') {
            // populate pending_subscriber, the approve-jid span, and
            // open the dialog
            Gab.pending_subscriber = from;
            $('#approve-jid').text(Strophe.getBareJidFromJid(from));
            $('#approve_dialog').dialog('open');
        } else if (ptype !== 'error') {
            var contact = $('#roster-list li#' + jid_id + ' .roster-contact')
                .removeClass("online")
                .removeClass("away")
                .removeClass("offline");
            if (ptype === 'unavailable') {
                contact.addClass("offline");
            } else {
                var show = $(presence).find("show").text();
                if (show === "" || show === "chat") {
                    contact.addClass("online");
                } else {
                    contact.addClass("away");
                }
            }

            var li = contact.parent();
            li.remove();
            Gab.insert_contact(li);
        }

        // reset addressing for user since their presence changed
        var jid_id = Gab.jid_to_id(from);
        $('#chat-' + jid_id).data('jid', Strophe.getBareJidFromJid(from));

        return true;
    },

    /*
     * called when status of any contact changed
     */
    on_roster_changed: function (iq) {
    	
        $(iq).find('item').each(function () {
            var sub = $(this).attr('subscription');
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var jid_id = Gab.jid_to_id(jid);

            if (sub === 'remove') {
                // contact is being removed
                $('#' + jid_id).remove();
            } else {
                // contact is being added or modified
                var contact_html = "<li id='" + jid_id + "'>" +
                    "<div class='" + 
                    ($('#' + jid_id).attr('class') || "roster-contact offline") +
                    "'>" +
                    "<div class='roster-name'>" +
                    name +
                    "</div><div class='roster-jid'>" +
                    jid +
                    "</div></div></li>";

                if ($('#' + jid_id).length > 0) {
                    $('#' + jid_id).replaceWith(contact_html);
                } else {
                    Gab.insert_contact($(contact_html));
                }
            }
        });

        return true;
    },

    
    /*
     * called when a message received
     */
    on_message: function (message) {
        var full_jid = $(message).attr('from');
        var jid = Strophe.getBareJidFromJid(full_jid);
        var jid_id = Gab.jid_to_id(jid);
        
        $('#chat-' + jid_id).data('jid', full_jid);

        $('#chat-' + jid_id + ' input').focus();

        var composing = $(message).find('composing');
        if (composing.length > 0) {
      	  if(!$("#person-status").html()){
	            $("#person-status").append(
	                "<div class='chat-event'>" +
	                " is typing...</div>");
      	  }
        }

        var body = $(message).find("html > body");
        
        if (body.length === 0) {
            body = $(message).find('body');
            if (body.length > 0) {
                body = body.text()
            } else {
                body = null;
            }
        } else {
            body = body.contents();
            
            var span = $("<span></span>");
            body.each(function () {
                if (document.importNode) {
                    $(document.importNode(this, true)).appendTo(span);
                } else {
                    // IE workaround
                    span.append(this.xml);
                }
            });

            body = span;
        }
                
        var person_jid = Strophe.getNodeFromJid(jid);
        if(person_jid != $("#person-info-wrapper #person-jid").html().split("@")[0]){
	      	$(".roster-contact").css("background-color", "#f4ebff");
	      	$("#message-wrapper").empty();
	      	var person_name;
	      	$(".roster-contact").each(function(){
	      		if($(this).find(".roster-jid").html().split("@")[0] == person_jid){
	      			person_name = $(this).find(".roster-name").html();
	      		}
	      	});
	      	$("#person-info-wrapper #person-name").empty();
	      	$("#person-info-wrapper #person-name").append(person_name);
	      	$("#person-info-wrapper #person-jid").empty();
	      	$("#person-info-wrapper #person-jid").append(person_jid);
        }
        

        if (body) {
            // remove notifications since user is now active
        	$('#person-info-wrapper #person-status').empty();

            $("#message-wrapper").append(
                  "<div class='row msg_container base_receive'>" +
                  "<div class='avatar'>" +
                  "<img src='http://www.bitrebels.com/wp-content/uploads/2011/02/Original-Facebook-Geek-Profile-Avatar-1.jpg' class='img-responsive'>" +
                  "</div>" +
                  "<div class='messages msg_receive'>"+
                  "<p>" +
                  "</p>" +
                  "</div>" +
                  "</div>");

            $('#message-wrapper .msg_container:last .messages p')
                .append(body);   
        }
        return true;
    },

 
    presence_value: function (elem) {
        if (elem.hasClass('online')) {
            return 2;
        } else if (elem.hasClass('away')) {
            return 1;
        }

        return 0;
    },

    /*
     * used to insert a roster to roster-list 
     */
    insert_contact: function (elem) {
        var jid = elem.find('.roster-jid').text();
        var pres = Gab.presence_value(elem.find('.roster-contact'));
        
        var contacts = $('#rosters-wrapper li');

        if (contacts.length > 0) {
            var inserted = false;
            contacts.each(function () {
                var cmp_pres = Gab.presence_value(
                    $(this).find('.roster-contact'));
                var cmp_jid = $(this).find('.roster-jid').text();

                if (pres > cmp_pres) {
                    $(this).before(elem);
                    inserted = true;
                    return false;
                } else if (pres === cmp_pres) {
                    if (jid < cmp_jid) {
                        $(this).before(elem);
                        inserted = true;
                        return false;
                    }
                }
            });

            if (!inserted) {
                $('#rosters-wrapper ul').append(elem);
            }
        } else {
            $('#rosters-wrapper ul').append(elem);
        }
    }
};

/*
 * called at first, when the page loaded
 */
$(document).ready(function () {
    
    $(document).trigger('connect', {
        jid: 'miri@viradev.ir',
        password: 'miri'
    });

    /*
     * called when the user click on one of roster in roster-list
     */
    $('.roster-contact').live('click', function () {
    	
    	$('#message-wrapper').empty();
    	$('.roster-contact').css("background-color","#f4ebff");
    	$(this).css("background-color","#ababab");
        var jid = $(this).find(".roster-jid").text();
        var name = $(this).find(".roster-name").text();
        Gab.person_selected = name;
        var jid_id = Gab.jid_to_id(jid);

        $("#person-info-wrapper #person-name").empty();
        $("#person-info-wrapper #person-name").append(name);
        $("#person-info-wrapper #person-jid").empty();
        $("#person-info-wrapper #person-jid").append(jid);
        $("#chat-input").data('jid', jid);
        
    });

    $('#roster-search-input').live('keyup', function(ev) {
    	var typed_value = $(this).val();
    	$('#roster-list li').each(function(){
    		var person_name = $(this).find(".roster-name").html();
    		if(person_name.toLowerCase().indexOf(typed_value.toLowerCase())>=0){
    			$(this).removeClass("hidden");
    		}
    		else{
    			$(this).addClass("hidden");
    		}
    	});
    });
    
    /*
     * called when the user start typing in input-chat
     * code 13 means the user pressed enter button
     */
    $('#chat-input').live('keypress', function (ev) {
        var jid = $(this).data('jid');

        if (ev.which === 13) {
            ev.preventDefault();

            var body = $(this).val();

            var message = $msg({to: jid,
                                "type": "chat",})
                .c('body').t(body).up()
                .c('active', {xmlns: "http://jabber.org/protocol/chatstates"});
            Gab.connection.send(message);
            
            $("#message-wrapper").append(
                "<div class='row msg_container base_sent'>" +
                "<div class='messages msg_sent'>"+
                "<p>" +
                body +
                "</p>" +
                "</div>" +
                "<div class='avatar'>" +
                "<img src='http://www.bitrebels.com/wp-content/uploads/2011/02/Original-Facebook-Geek-Profile-Avatar-1.jpg' class='img-responsive'>" +
                "</div>" +
                "</div>");
            
            $(this).val('');
            $(this).parent().data('composing', false);
        } else {
            var composing = $(this).parent().data('composing');
            if (!composing) {
                var notify = $msg({to: jid, "type": "chat"})
                    .c('composing', {xmlns: "http://jabber.org/protocol/chatstates"});
                Gab.connection.send(notify);

                $(this).parent().data('composing', true);
            }
        }
    });

    /*
     * called when the client disconnected
     */
    $('#disconnect').click(function () {
    	console.log("disconnected");
        Gab.connection.disconnect();
        Gab.connection = null;
    });
    
});

/*
 * called when event connect occurred
 */
$(document).bind('connect', function (ev, data) {
	console.log("connect");
	
    var conn = new Strophe.Connection(
        'http://bosh.metajack.im:5280/xmpp-httpbind');
    
    conn.connect(data.jid, data.password, function (status) {
        if (status === Strophe.Status.CONNECTED) {
            $(document).trigger('connected');
        } else if (status === Strophe.Status.DISCONNECTED) {
            $(document).trigger('disconnected');
        }
    });

    Gab.connection = conn;
});

/*
 * called when the client connected to server 
 */
$(document).bind('connected', function () {
	console.log("connected");
	
    var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    Gab.connection.sendIQ(iq, Gab.on_roster);

    Gab.connection.addHandler(Gab.on_roster_changed,
                              "jabber:iq:roster", "iq", "set");

    Gab.connection.addHandler(Gab.on_message,
                              null, "message", "chat");
});

$(document).bind('disconnected', function () {
	console.log("disconnected");
    Gab.connection = null;
    Gab.pending_subscriber = null;

    $('#roster-area ul').empty();
    $('#chat-area ul').empty();
    $('#chat-area div').remove();

    $('#login_dialog').dialog('open');
});










