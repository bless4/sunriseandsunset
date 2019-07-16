import React, { Component } from "react";
import Axios from "axios";
import {
  Header,
  Calendar,
  Location,
  Times,
  Buttons,
  Spinner,
} from "./components";
import {
  extractGeoData,
  convertTimes,
  getTimezone,
  convertDate,
  makeSunURL,
} from "./helpers";

const API_KEY = process.env.REACT_APP_API_KEY;

class App extends Component {
  state = {
    location: "",
    geoInfo: {},
    date: convertDate(new Date()),
    times: {},
    error: "",
    isRequestDone: false,
    isGPSActive: false,
    isCalendarOpen: false,
  };

  getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async position => {
        this.setState({ isGPSActive: true, location: "Current Location" });
        const {
          coords: { latitude, longitude },
        } = position;
        const resultsLimit = 1;
        this.setState({ times: {}, isLoading: true, isRequestDone: false });

        const point = `${latitude},${longitude}`;
        const url = `https://graphhopper.com/api/1/geocode?point=${point}&limit=${resultsLimit}&reverse=true&key=${API_KEY}`;

        const {
          data: { hits: results },
        } = await Axios.get(url);

        const extractedResults = extractGeoData(results);
        this.setState({ geoInfo: { ...extractedResults } });
        this.getTimeZone({ lat: latitude, lng: longitude });
        this.getTimes();
      });
    }
  };

  setLocation = async () => {
    const { location } = this.state;
    this.setState({
      error: "",
      times: {},
      isLoading: true,
      isRequestDone: false,
    });

    if (!location) {
      return;
    }

    const locationURI = encodeURIComponent(location);

    const { lat, lng } = await this.geocodeLocation(locationURI);
    if (!lat || !lng) return;
    this.getTimeZone({ lat, lng });
    this.getTimes();
  };

  geocodeLocation = async location => {
    const resultsLimit = 1;
    const url = `https://graphhopper.com/api/1/geocode?q=${location}&limit=${resultsLimit}&key=${API_KEY}`;

    const {
      data: { hits: results },
    } = await Axios.get(url);

    if (!results[0]) {
      return this.setState({ error: "No matches found for that location." });
    }

    const extractedResults = extractGeoData(results);
    this.setState({ geoInfo: { ...extractedResults } });

    return { ...results[0].point };
  };

  getTimeZone = ({ lat, lng }) => {
    const timezone = getTimezone({ lat, lng });

    this.setState({ geoInfo: { ...this.state.geoInfo, timezone } });
  };

  getTimes = async () => {
    const { lat, lng } = this.state.geoInfo.point;
    const { date } = this.state;
    const url = makeSunURL({ lat, lng, date });

    const {
      data: { results },
    } = await Axios.get(url).catch(err => console.log(err));

    this.extractTimes(results);

    this.setState({ isLoading: false, isRequestDone: true });
  };

  extractTimes = ({ sunrise, sunset, solar_noon }) => {
    const timezone = this.state.geoInfo.timezone;
    const times = [sunrise, sunset, solar_noon];

    [sunrise, sunset, solar_noon] = convertTimes(times, timezone);

    this.setState({ times: { sunrise, sunset, solar_noon } });
  };

  onCalendarChange = date => {
    const convertedDate = convertDate(date);

    this.setState({
      date: convertedDate,
      isCalendarOpen: false,
    });

    if (this.state.geoInfo.point) {
      this.getTimes();
    }
  };

  onLocationChange = e => {
    const { isGPSActive } = this.state;

    if (isGPSActive) {
      this.setState({ isGPSActive: !isGPSActive });
    }

    this.setState({ location: e.target.value });
  };

  onCalendarToggle = () => {
    const { isCalendarOpen } = this.state;

    this.setState({ isCalendarOpen: !isCalendarOpen });
  };

  renderDataOrLoading = () => {
    const { isLoading, isRequestDone, times, geoInfo, error } = this.state;

    if (!isLoading && isRequestDone) {
      return (
        <div>
          <Location geoInfo={geoInfo} error={error} />
          <Times times={times} />
        </div>
      );
    }

    if (isLoading) {
      return <Spinner />;
    }
  };

  render() {
    const { date, location, isGPSActive, isCalendarOpen } = this.state;

    return (
      <div className="App">
        <Header />
        <Buttons
          date={date}
          location={location}
          onLocationChange={this.onLocationChange}
          onCalendarToggle={this.onCalendarToggle}
          getTimes={this.getTimes}
          getLocation={this.getLocation}
          setLocation={this.setLocation}
          isGPSActive={isGPSActive}
        />
        <Calendar
          isCalendarOpen={isCalendarOpen}
          onChange={date => this.onCalendarChange(date)}
        />
        {this.renderDataOrLoading()}
      </div>
    );
  }
}

export default App;
