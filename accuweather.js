import fetch from 'node-fetch';

// Zapier's output
let output;

/**
 * Zapier wraps the step inside
 * an async function. The code inside the block below
 * must be copied into a Zapier step.
 * I'm using a const instead to facilitate testings.
 */
const zapierStep = async () => {
  // Copy from here
  const accuweatherEndpoint = 'http://dataservice.accuweather.com/forecasts/v1/daily/1day/44857?apikey=QnZovkVXNjgfPtArvRps9C9W4xKGPDP1&details=true&metric=true';

  const forecast = async (endpoint) => {
    try {
      const data = await fetch(endpoint);
      if (data.ok) {
        const result = await data.json();
        return result;
      }
    } catch (error) {
      return new Error(error);
    }

    return undefined;
  };

  const todayForecast = await forecast(accuweatherEndpoint);

  const { Headline, DailyForecasts } = todayForecast;
  const { Text } = Headline;
  const { RealFeelTemperature } = DailyForecasts[0];
  const { RainProbability } = DailyForecasts[0].Day;
  const minimum = RealFeelTemperature.Minimum.Value;
  const maximum = RealFeelTemperature.Maximum.Value;

  output = [{
    forecastHeadline: Text,
    rainProbability: RainProbability,
    minimum,
    maximum,
  }];
  // Don't copy from here and below
  return output;
};

// Tests
zapierStep()
  .then((result) => {
    const {
      forecastHeadline,
      rainProbability,
      minimum,
      maximum,
    } = result[0];
    console.log('Forecast:');
    console.log('Headline:', forecastHeadline);
    console.log('Rain Probability:', rainProbability);
    console.log('Minimum:', minimum);
    console.log('Maximum:', maximum);
  });
