function sendToKindle() {
  console.log("--- Starting Universal EPUB Engine (No Covers, No Links, Fixed Images) ---");

  // Fetch properties dynamically
  var includeLabelName = PropertiesService.getScriptProperties().getProperty('GMAIL_INCLUDE_LABEL');
  var excludeLabelName = PropertiesService.getScriptProperties().getProperty('GMAIL_EXCLUDE_LABEL');
  var kindleEmail = PropertiesService.getScriptProperties().getProperty('RECIPIENT_EMAIL');

  if (!includeLabelName || !excludeLabelName || !kindleEmail) {
    console.log("Missing Script Properties! Please ensure GMAIL_INCLUDE_LABEL, GMAIL_EXCLUDE_LABEL, and RECIPIENT_EMAIL are set.");
    return;
  }

  // --- 1. SETUP THE EXCLUDE LABEL ---
  var excludeLabel = GmailApp.getUserLabelByName(excludeLabelName);
  if (!excludeLabel) {
    excludeLabel = GmailApp.createLabel(excludeLabelName);
  }

  // --- 2. SEARCH QUERY ---
  var searchQuery = 'label:' + includeLabelName + ' is:unread -label:' + excludeLabelName;
  var threads = GmailApp.search(searchQuery);
  
  if (threads.length === 0) {
    console.log("No new newsletters found matching criteria.");
    return;
  }

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();
    var processedAnyInThread = false;
    
    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      
      // --- 3. VERIFY MESSAGE IS UNREAD ---
      if (msg.isUnread()) {
        var originalSubject = msg.getSubject();
        
        // --- 4. SENDER & DATE FORMATTING ---
        var rawSender = msg.getFrom();
        var senderName = rawSender.split('<')[0].replace(/"/g, '').trim() || "Newsletter";

        var d = msg.getDate();
        var yyyy = d.getFullYear();
        var mm = ("0" + (d.getMonth() + 1)).slice(-2);
        var dd = ("0" + d.getDate()).slice(-2);
        var formattedDate = yyyy + "-" + mm + "-" + dd;
        
        // Exact formatting: YYYY-MM-DD - [Newsletter name]
        var groupedTitle = formattedDate + " - [" + senderName + "]";
        var uuid = Utilities.getUuid();
        
        console.log(">> Processing: " + groupedTitle);

        // --- 5. UNIVERSAL HTML CLEANUP ---
        var $ = Cheerio.load(msg.getBody());
        
        // Remove bad elements
        $('script, style, picture, source, svg, iframe, form, button, nav, meta, link, noscript').remove();
        
        // **NEW: DISABLE ALL HYPERLINKS**
        // This replaces <a> tags with plain <span> tags, keeping the text but destroying the clickability.
        $('a').each(function() {
          $(this).replaceWith('<span>' + $(this).html() + '</span>');
        });

        // **NEW: SURGICAL DIMENSION STRIPPING TO FIX SQUISHED IMAGES**
        // We wipe ALL inline styles, classes, widths, and heights so the Kindle renderer takes over completely.
        $('*').removeAttr('style').removeAttr('class').removeAttr('id');
        $('*').removeAttr('width').removeAttr('height'); 

        var manifestItems = "";
        var epubBlobs = [];
        epubBlobs.push(Utilities.newBlob("application/epub+zip", "text/plain", "mimetype"));
        var imgCounter = 0;

        // --- 6. IMAGE EXTRACTION ---
        $('img').each(function() {
          var el = $(this);
          var validUrl = "";
          
          var attribs = el[0].attribs;
          for (var key in attribs) {
            var val = attribs[key];
            if (val && (val.startsWith('http') || val.startsWith('//'))) {
              if (!val.includes('open.gif') && !val.includes('pixel') && !val.includes('tracker')) {
                validUrl = val; break;
              }
            }
          }

          if (!validUrl) { el.remove(); return; }

          imgCounter++;
          try {
            var fetchUrl = validUrl.replace(/&amp;/g, '&');
            if (fetchUrl.startsWith("//")) fetchUrl = "https:" + fetchUrl;
            
            var response = UrlFetchApp.fetch(fetchUrl, { muteHttpExceptions: true, headers: { "User-Agent": "Mozilla/5.0" } });
            
            if (response.getResponseCode() == 200) {
              var imgBlob = response.getBlob();
              var mime = imgBlob.getContentType() || "image/jpeg";
              var ext = mime.includes("png") ? "png" : mime.includes("gif") ? "gif" : "jpg";
              
              var localName = "img" + imgCounter + "." + ext;
              imgBlob.setName(localName).setContentType(mime);
              epubBlobs.push(imgBlob); 
              
              manifestItems += '<item id="img' + imgCounter + '" href="' + localName + '" media-type="' + mime + '"/>\n';
              
              // Remove all original tracking/sizing attributes from the image tag
              var allKeys = Object.keys(attribs);
              for (var k = 0; k < allKeys.length; k++) { el.removeAttr(allKeys[k]); }
              
              // Only apply the local source and an alt tag
              el.attr('src', localName); 
              el.attr('alt', 'Image');
            } else { el.remove(); }
          } catch (e) { el.remove(); }
        });

        // --- 7. FINAL HTML PREPARATION & CSS ---
        var cleanBody = $('body').html() || "";
        cleanBody = cleanBody.replace(/&nbsp;/gi, " ").replace(/<nobr[^>]*>/gi, "").replace(/<\/nobr>/gi, "");
        cleanBody = cleanBody.replace(/<br>/gi, "<br/>").replace(/<hr>/gi, "<hr/>");
        cleanBody = cleanBody.replace(/<img([^>]+[^\/])>/gi, "<img$1/>");

        // The height: auto !important rule will perfectly scale the images now that hardcoded HTML heights are deleted.
        var readerCSS = `<style>
          * { max-width: 100% !important; box-sizing: border-box !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
          body { font-family: sans-serif; padding: 5px; margin: 0; width: 100%; overflow-x: hidden; line-height: 1.5; font-size: 1.1em; color: #000; }
          img { max-width: 100% !important; height: auto !important; border-radius: 4px; }
          p, div { margin-bottom: 1em; width: 100% !important; }
          table, tbody, tr, th, td { display: block !important; width: 100% !important; max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; }
        </style>`;
        
        var headTags = '<meta charset="utf-8"/>\n<meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n<title>' + groupedTitle + '</title>\n' + readerCSS;

        var contentXml = '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head>\n' + headTags + '\n</head>\n<body>\n<h2>' + originalSubject + '</h2>\n<p style="border-bottom: 1px solid #ccc; padding-bottom: 10px; color: #555;"><b>From:</b> ' + senderName + '</p>\n' + cleanBody + '\n</body>\n</html>';
        epubBlobs.push(Utilities.newBlob(contentXml, "application/xhtml+xml", "content.xhtml"));

        // --- 8. ASSEMBLE EPUB (No Cover Metadata) ---
        var opfXml = '<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">\n<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">\n<dc:title>' + groupedTitle + '</dc:title>\n<dc:creator opf:role="aut">' + senderName + '</dc:creator>\n<dc:language>en</dc:language>\n<dc:identifier id="BookId">urn:uuid:' + uuid + '</dc:identifier>\n</metadata>\n<manifest>\n<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>\n' + manifestItems + '</manifest>\n<spine toc="ncx">\n<itemref idref="content"/>\n</spine>\n</package>';
        epubBlobs.push(Utilities.newBlob(opfXml, "application/oebps-package+xml", "content.opf"));

        var ncxXml = '<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n<head><meta name="dtb:uid" content="' + uuid + '"/></head>\n<docTitle><text>' + groupedTitle + '</text></docTitle>\n<navMap>\n<navPoint id="navPoint-1" playOrder="1">\n<navLabel><text>Start</text></navLabel>\n<content src="content.xhtml"/>\n</navPoint>\n</navMap>\n</ncx>';
        epubBlobs.push(Utilities.newBlob(ncxXml, "application/x-dtbncx+xml", "toc.ncx"));

        var containerXml = '<?xml version="1.0"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n<rootfiles>\n<rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>\n</rootfiles>\n</container>';
        epubBlobs.push(Utilities.newBlob(containerXml, "application/xml", "META-INF/container.xml"));

        // --- 9. PACKAGE AND SEND ---
        var safeFileName = groupedTitle.replace(/[^a-zA-Z0-9 \[\]\-]/g, "").trim() + ".epub";
        var epubArchive = Utilities.zip(epubBlobs, safeFileName);
        epubArchive.setContentType("application/epub+zip");

        GmailApp.sendEmail(kindleEmail, groupedTitle, "Compiled flawlessly.", {
          attachments: [epubArchive]
        });

        console.log("   - Success! Sent to Kindle.");
        processedAnyInThread = true;
      }
    }

    // --- 10. MARK THREAD AS PROCESSED ---
    if (processedAnyInThread) {
      thread.addLabel(excludeLabel);
    }
  }
}
