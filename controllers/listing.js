const { Query } = require("mongoose");
const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const { response } = require("express");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken});

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
let {id} = req.params;
const listing = await Listing.findById(id)
.populate({ 
    path: "reviews",
    populate: {
        path: "author",
    },
})
.populate("owner");
if(!listing){
    req.flash("error", "Listing you requested for does not exist");
    res.redirect("/listings");
}
console.log(listing);
res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
  let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
    })
    .send();
    const newListing = new Listing(req.body.listing);

    if (req.file) {
        newListing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    } else {
        // optional: fallback/default image or error handling
        req.flash("error", "Image is required!");
        return res.redirect("/listings/new");
    }

    newListing.owner = req.user._id;
    newListing.geometry = response.body.features[0].geometry;
    let savedListing = await newListing.save();
    console.log(savedListing);
    req.flash("success", "New Listing Created!");
    res.redirect(`/listings/${newListing._id}`);
};


module.exports.renderEditForm = async(req, res)=>{
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
    req.flash("error", "Listing you requested for does not exist");
    res.redirect("/listings");
}    

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_300,w_250"); 
    res.render("listings/edit.ejs", { listing, originalImageUrl });

};

module.exports.updateListing = async (req, res) => {
    if (!req.body.listing) {
        throw new ExpressError(400, "Send valid data for listing");
    }

    const { id } = req.params;
    const existingListing = await Listing.findById(id);

    if (!req.body.listing.image || !req.body.listing.image.url || req.body.listing.image.url.trim() === "") {
        req.body.listing.image = existingListing.image;
    }
    let listing = await Listing.findByIdAndUpdate(id, req.body.listing);

    if(typeof req.file !== "undefined"){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();
    }
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    const listing = await Listing.findByIdAndDelete(req.params.id);
    req.flash("success", " Listing Deleted!");
    if (!listing) {
        return res.send("Listing not found or already deleted");
    }
    res.redirect("/listings");
};