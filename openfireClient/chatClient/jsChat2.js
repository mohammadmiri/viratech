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
        	console.log("in each function");
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

   
    /*
     * should be find out by mohammad
     */
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
            var contact = $('#roster-area li#' + jid_id + ' .roster-contact')
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
     * called when a message should be send 
     */
    on_message: function (message) {
    	console.log("on_message");
    	
        var full_jid = $(message).attr('from');
        var jid = Strophe.getBareJidFromJid(full_jid);
        var jid_id = Gab.jid_to_id(jid);
        
        
        $('#chat-' + jid_id).data('jid', full_jid);

        $('#chat-' + jid_id + ' input').focus();

        var composing = $(message).find('composing');
        if (composing.length > 0) {
      	  console.log("isTyping");
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
      console.log("person_jid: "+person_jid);
      console.log("person_jid2: "+$("#person-info-wrapper #person-jid").html().split("@")[0]);
      if(person_jid != $("#person-info-wrapper #person-jid").html().split("@")[0]){
	      	console.log("message-wrapper should be clear");
	      	$(".roster-contact").css("background-color", "#f4ebff");
	      	$("#message-wrapper").empty();
	      	var person_name;
	      	$(".roster-contact").each(function(){
	      		
	      		if($(this).find(".roster-jid").html().split("@")[0] == person_jid){
	      			console.log("in if each");
	      			person_name = $(this).find(".roster-name").html();
	      			console.log("person_name: "+person_name);
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
                  "<div class='chat-message'>" +
                  "<p class='chat-name'>" +
                  Strophe.getNodeFromJid(jid) +
                  "</p><p class='chat-text'>" +
                  "</p></div>");

            $('#message-wrapper .chat-message:last .chat-text')
                .append(body);
        }

        return true;
    },

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    /*
     * called when a message received
     */
//    on_message: function (message) {
//    	console.log("on_message");
//    	
//        var full_jid = $(message).attr('from');
//        var jid = Strophe.getBareJidFromJid(full_jid);
//        var jid_id = Gab.jid_to_id(jid);
//        
//        console.log("full_jid: "+full_jid);
//        console.log("jid: "+jid);
//        console.log("jid_id: "+jid_id);
//        
//        
//        $('#chat-input').data('jid', full_jid);
//
//        $('#chat-input').focus();
//
//        /*
//         * used to find out that the user is typing or not
//         */
//        console.log("before composing");
//        var composing = $(message).find('composing');
//        if (composing.length > 0) {
//        	console.log("isTyping");
//        	if(!$("#person-status").html()){
//	            $("#person-status").append(
//	                "<div class='chat-event'>" +
//	                //Strophe.getNodeFromJid(jid) +
//	                " is typing...</div>");
//        	}
//        }
//
//        
//        /*
//         * used to determine that the message contains a text or not
//         */
//        console.log("before find body");
//        var body = $(message).find("html > body");
////        if (body.length == 0) {
//            body = $(message).find('body');
//            console.log("body: "+body);
//            console.log("body.length: "+body.length);
//            if (body.length > 0) {
//                body = body.text()
//                console.log("body2: "+body);
//            } else {
//                body = null;
//            }
////        } else {
////            body = body.contents();
////            console.log("body3: "+body);
////            var span = $("<span></span>");
////            body.each(function () {
////                if (document.importNode) {
////                    $(document.importNode(this, true)).appendTo(span);
////                } else {
////                    // IE workaround
////                    span.append(this.xml);
////                }
////            });
////            body = span;
////            console.log("body4: "+body);
////        }
//        
//        
//        
//
//        var person_jid = Strophe.getNodeFromJid(jid);
//        console.log("person_jid: "+person_jid);
//        if(person_jid != $("#person-info-wrapper #person-jid").html().split("@")[0]){
//        	console.log("message-wrapper should be clear");
//        	$(".roster-contact").css("background-color", "#ffffff");
//        	$("#message-wrapper").empty();
//        	var person_name;
//        	$(".roster-contact").each(function(){
//        		console.log("in my each:"+$(this).find(".roster-jid").html()+" "+person_jid);
//        		if($(this).find(".roster-jid").html() == person_jid){
//        			console.log("in if each");
//        			person_name = $(this).find(".roster-name").html();
//        			console.log("person_name: "+person_name);
//        		}
//        	});
//        	$("#person-info-wrapper #person-name").empty();
//            $("#person-info-wrapper #person-name").append(person_name);
//            $("#person-info-wrapper #person-jid").empty();
//            $("#person-info-wrapper #person-jid").append(person_jid);
//        }
//        
//        /*
//         * used to appending the body of message to chat-container
//         */
//        console.log("before if body condition");
//        if (body) {
//        	console.log("in if body:"+body);
//            // remove notifications since user is now active
//            $('#person-info-wrapper #person-status').empty();
//
//            // add the new message
//            $("#message-wrapper").append(
//                "<div class='chat-message'>" +
//                "<p class='chat-name'>" +
//                Strophe.getNodeFromJid(jid) +
//                "</p><p class='chat-text'>" +
//                body+
//                "</p></div>");
//        }
//
//        return true;
//    },

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
   console.log("in ready function");
    
    $(document).trigger('connect', {
        jid: 'miri@viradev.ir',
        password: 'miri'
    });

    /*
     * called when the user click on one of roster in roster-list
     * 
     * should be modified later by mohammad
     */
    $('.roster-contact').live('click', function () {
    	console.log("in roster-contact click" + $(this).html());
    	
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

    /*
     * called when the user start typing in input-chat
     * code 13 means the user pressed enter button
     * 
     * should be modified later by mohammad
     */
    $('#chat-input').live('keypress', function (ev) {
        var jid = $(this).data('jid');
        console.log("in live chat-input: "+jid)

        if (ev.which === 13) {
            ev.preventDefault();

            var body = $(this).val();

            var message = $msg({to: jid,
                                "type": "chat",})
                .c('body').t(body).up()
                .c('active', {xmlns: "http://jabber.org/protocol/chatstates"});
            Gab.connection.send(message);
            
            console.log("msg: "+message);

            $("#message-wrapper").append(
                "<div class='chat-message'>" +
                "<p class='chat-name me'>" + 
                Strophe.getNodeFromJid(Gab.connection.jid) +
                "</p><p class='chat-text'>" +
                body +
                "</p></div>");

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
     * called when the user click on disconnect button
     */
    $('#disconnect').click(function () {
        Gab.connection.disconnect();
        Gab.connection = null;
    });
    



//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
////////////////////////all code of bootsnipp.com ///////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////


    
    
    
    
    $(document).live('click', '.panel-heading span.icon_minim', function (e) {
        var $this = $(this);
        if (!$this.hasClass('panel-collapsed')) {
            $this.parents('.panel').find('.panel-body').slideUp();
            $this.addClass('panel-collapsed');
            $this.removeClass('glyphicon-minus').addClass('glyphicon-plus');
        } else {
            $this.parents('.panel').find('.panel-body').slideDown();
            $this.removeClass('panel-collapsed');
            $this.removeClass('glyphicon-plus').addClass('glyphicon-minus');
        }
    });
    $(document).live('focus', '.panel-footer input.chat_input', function (e) {
        var $this = $(this);
        if ($('#minim_chat_window').hasClass('panel-collapsed')) {
            $this.parents('.panel').find('.panel-body').slideDown();
            $('#minim_chat_window').removeClass('panel-collapsed');
            $('#minim_chat_window').removeClass('glyphicon-plus').addClass('glyphicon-minus');
        }
    });
    $(document).live('click', '#new_chat', function (e) {
        var size = $( ".chat-window:last-child" ).css("margin-left");
         size_total = parseInt(size) + 400;
        alert(size_total);
        var clone = $( "#chat_window_1" ).clone().appendTo( ".container" );
        clone.css("margin-left", size_total);
    });
    $(document).live('click', '.icon_close', function (e) {
        //$(this).parent().parent().parent().parent().remove();
        $( "#chat_window_1" ).remove();
    });

    
///////////////////////////////////////////////////////////////////////////    
//    /////////////////////////////////////////////////////////////////////
//    /////////////////////////////////////////////////////////////////////
//    ///////////////////end all code of bootsnipp.com/////////////////////
//    /////////////////////////////////////////////////////////////////////
//    /////////////////////////////////////////////////////////////////////
    

});

/*
 * called when event connect occurred
 */
$(document).bind('connect', function (ev, data) {
	console.log("in connect bind");
	
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
 * called when the user connected to server 
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










