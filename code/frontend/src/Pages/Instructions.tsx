//import Lobby from '../Lobby';
import image1 from "../assets/Battery.png";
import image2 from "../assets/ButPowerMarket.png";
import image3 from "../assets/BuyAssets.png";
import image4 from "../assets/ConfigureAssets.png";
import image5 from "../assets/DemandResponse.png";
import image6 from "../assets/Generation and Load.png";
import image7 from "../assets/Grid Frequency.png";
import image8 from "../assets/Manual Controller.png";
import image9 from "../assets/Overview.png";
import image10 from "../assets/Players.png";
import image11 from "../assets/Power Controller.png";
import image12 from "../assets/Security.png";
import image13 from "../assets/SellMarket.png";
import { Link, useNavigate } from 'react-router-dom';

export default function Instructions() {
return (
<div>
<div>
<br />
<br />
<img src={image1} alt="The battery" />
<br />
The grid operator has several tools at their disposal to stabilize the grid in this game.
The first is a storage (battery) source that can be used to balance the net power level
by injecting power into or absorbing power from the grid.
</div>
<div>
            <br />
            <br />
            <img src={image11} alt="Grid Power Control" />
            <br />
            Control the power put onto the grid with this input to the power inverter.
            <br />
            Positive values will add power to the grid, taking it from the storage source.
            Negative values will subtract power from the grid, giving it to the storage.
            <br />
            Adding power such that there is a net surplus will increase the speed of the synchronous machines of the grid.
            This results in an increase in grid frequency. On the contrary, a power deficit will reduce the frequency.
        </div>

        <div>
            <br />
            <br />
            <img src={image7} alt="Grid frequency" />
            <br />
            You must monitor the frequency and keep it very near 60 Hz (cycles per second),
            since big machines are designed to run at a fixed speed.
            Machines will shut down to protect themselves.
            If frequency goes too high or low, a blackout will occur on your grid.
        </div>

        <div>
            <br />
            <br />
            <img src={image8} alt="Automatic Control" />
            <br />
            You could choose to do manual control. But, you will get tired of that and make errors.
            <br />
            An automatic feedback control system compares
            the frequency to the set point and feeds the error signal through gains (multiplier) to correct the power imbalance.
            Closed loop feedback is the basis for automatic control systems.
            <br />
            Adjust main gain to get faster or slower response.
            Adjust the sum gain to compensate based on the integral error (i.e. reduce the overall phase).
            Rate gain adjusts input based on the derivative of frequency error.
            <br />
            Experiment and get a feel for these different gains to maximize your rating.
        </div>

        <div>
            <br />
            <br />
            <img src={image10} alt="Player View" />
            <br />
            Your score/profits is based on total power delivered multiplied by the price and your performance rating.
            <br />
            Performance is based on low frequency and phase error and on avoiding rapid changes in the battery discharge, which could prematurely degrade a battery.
            <br />
            When your battery fills up, any extra power on the grid cannot be stored.
            The inverter will simply burn the excess power through a resistor bank as heat.
            You are penalized for wasting energy.
        </div>

        <div>
            <br />
            <br />
            <img src={image6} alt="generation and Load" />
            <br />
            Monitor the detailed history versus time in this tab, when you have time to analyze things.
        </div>

        <div>
            <br />
            <br />
            <img src={image2} alt="Purchase contracts" />
            <br />
            When other grids put power on the market, this section will provide you an opportunity to purchase power for an offered price and duration.
            The amount of power will be added to your power balance for the duration listed.
            <br />
            Also, you can monitor the status of the contracts you have purchased.
        </div>

        <div>
            <br />
            <br />
            <img src={image13} alt="Offer contracts" />
            <br />
            The offer contracts page provides the interface to sell contracts to other grids for net income to your grid.
            <br />
            Once another grid purchases your contract,
            the specified amount of power will be subtracted from your power balance and your score will be credited with the value of the contract.
        </div>

        <div>
            <br />
            <br />
            <img src={image5} alt="Demand Response" />
            <br />
            Industrial loads are customers
            that consume a fixed amount
            of power, making them easier to
            account for since their load is
            constant.
            <br />
            These customers have made
            an agreement to allow you
            to turn off their power for
            a specified duration in
            return for compensation.
            <br />
            Recruiting industrial customers
            is another way to increase
            your score by selling more
            power.
            <br />
            Negotiate the terms of your
            contract and recruitment
            cost.
        </div>

        <div>
            <br />
            <br />
            <img src={image12} alt="Cybersecurity" />
            <br />
            Your grid is a cyber-physical system.
            Software and firmware have
            a possibility of containing
            vulnerabilities. This screen shows
            you activities that may be abnormal
            and allows you to purchase
            services to prevent some and
            remedy others. Beware the Blue Frog...
            it may make you go open
            loop!
        </div>

        <div>
            <br />
            <br />
            <img src={image9} alt="Overview" />
            <br />
            This screen shows your grid frequency (which is what you need to keep balanced to not lose),
            your total energy generation and load, your machine inertia, wind units, hydro units (energy production),
            and standard consumers. It shows how much energy you have delivered, the net cost of your energy,
            and how much energy you have wasted.
        </div>

        <div>
            <br />
            <br />
            <img src={image3} alt="Purchase assets" />
            <br />
            In this screen, you have the opportunity to manage (buy) grid assets.
            As your score improves, add more standard (residential) customers, and more generation units to grow your grid.
            The more generation and customers you have the more energy you sell and the more cash you earn.
            With increase in storage, you may be in position to sell power to other grids.
        </div>

        <div>
            <br />
            <br />
            <img src={image4} alt="Configure assets" />
            <br />
            The amount of energy you get from your different sources can fluctuate.
            You can see the min, mean and max energy output for each energy source, as well as your customer.
        </div>

        <p className="form-links">
          <br />
          <br />
          <Link to="/">Back to home</Link>
          <br />
          <br />
        </p>
    </div>
); 
}